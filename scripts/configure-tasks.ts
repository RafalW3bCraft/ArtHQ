import "dotenv/config";
import { GoogleAuth } from "google-auth-library";
import { tasksConfigured } from "../server/tasks";
if (!tasksConfigured())
  throw new Error("Set all TASKS_* configuration before creating the queue.");
const parent = `projects/${process.env.TASKS_PROJECT_ID}/locations/${process.env.TASKS_LOCATION}`;
const queue = {
  name: `${parent}/queues/${process.env.TASKS_QUEUE}`,
  rateLimits: { maxConcurrentDispatches: 1, maxDispatchesPerSecond: 1 },
  retryConfig: {
    maxAttempts: 3,
    minBackoff: "10s",
    maxBackoff: "60s",
    maxDoublings: 3,
    maxRetryDuration: "600s",
  },
};
const client = await new GoogleAuth({
  scopes: ["https://www.googleapis.com/auth/cloud-platform"],
}).getClient();
try {
  await client.request({
    url: `https://cloudtasks.googleapis.com/v2/${queue.name}?updateMask=rateLimits,retryConfig`,
    method: "PATCH",
    data: queue,
    timeout: 15000,
  });
} catch (error: any) {
  if (error.response?.status !== 404)
    throw new Error(
      "Could not configure queue. Check credentials, Cloud Tasks API and IAM.",
    );
  await client.request({
    url: `https://cloudtasks.googleapis.com/v2/${parent}/queues`,
    method: "POST",
    data: queue,
    timeout: 15000,
  });
}
console.log(
  JSON.stringify({ queue: queue.name, concurrency: 1, maxAttempts: 3 }),
);
