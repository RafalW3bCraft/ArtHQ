import { GoogleAuth, OAuth2Client } from "google-auth-library";
export const tasksConfigured = () =>
  !!(
    process.env.TASKS_PROJECT_ID &&
    process.env.TASKS_LOCATION &&
    process.env.TASKS_QUEUE &&
    process.env.TASKS_WORKER_URL &&
    process.env.TASKS_SERVICE_ACCOUNT
  );
export async function enqueueGeneration(jobId: string) {
  if (!tasksConfigured())
    throw Object.assign(
      new Error("Article generation needs its task queue configured."),
      { status: 503 },
    );
  const parent = `projects/${process.env.TASKS_PROJECT_ID}/locations/${process.env.TASKS_LOCATION}/queues/${process.env.TASKS_QUEUE}`;
  const url = new URL(
    `/internal/generation/${encodeURIComponent(jobId)}`,
    process.env.TASKS_WORKER_URL,
  ).href;
  const auth = new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  const client = await auth.getClient();
  await client.request({
    url: `https://cloudtasks.googleapis.com/v2/${parent}/tasks`,
    method: "POST",
    timeout: 15000,
    data: {
      task: {
        httpRequest: {
          httpMethod: "POST",
          url,
          headers: { "Content-Type": "application/json" },
          body: Buffer.from("{}").toString("base64"),
          oidcToken: {
            serviceAccountEmail: process.env.TASKS_SERVICE_ACCOUNT,
            audience: process.env.TASKS_WORKER_URL,
          },
        },
        dispatchDeadline: "120s",
      },
    },
  });
}
export async function verifyTaskToken(authorization: string | undefined) {
  if (!tasksConfigured() || !authorization?.startsWith("Bearer ")) return false;
  try {
    const ticket = await new OAuth2Client().verifyIdToken({
      idToken: authorization.slice(7),
      audience: process.env.TASKS_WORKER_URL,
    });
    const payload = ticket.getPayload();
    return (
      payload?.email_verified === true &&
      payload.email === process.env.TASKS_SERVICE_ACCOUNT
    );
  } catch {
    return false;
  }
}
