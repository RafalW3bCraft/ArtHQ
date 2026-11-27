import { afterEach, expect, it, vi } from "vitest";
const verify = vi.hoisted(() => vi.fn());
vi.mock("google-auth-library", () => ({
  GoogleAuth: vi.fn(),
  OAuth2Client: class {
    verifyIdToken = verify;
  },
}));
import { verifyTaskToken } from "../server/tasks";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});
it("requires a verified Google token for the configured audience and caller", async () => {
  for (const [key, value] of Object.entries({
    TASKS_PROJECT_ID: "demo",
    TASKS_LOCATION: "asia-south1",
    TASKS_QUEUE: "articles",
    TASKS_WORKER_URL: "https://api.example",
    TASKS_SERVICE_ACCOUNT: "tasks@demo.iam.gserviceaccount.com",
  }))
    vi.stubEnv(key, value);
  expect(await verifyTaskToken(undefined)).toBe(false);
  verify.mockResolvedValue({
    getPayload: () => ({
      email_verified: true,
      email: "other@demo.iam.gserviceaccount.com",
    }),
  });
  expect(await verifyTaskToken("Bearer signed")).toBe(false);
  verify.mockResolvedValue({
    getPayload: () => ({
      email_verified: false,
      email: "tasks@demo.iam.gserviceaccount.com",
    }),
  });
  expect(await verifyTaskToken("Bearer signed")).toBe(false);
  verify.mockResolvedValue({
    getPayload: () => ({
      email_verified: true,
      email: "tasks@demo.iam.gserviceaccount.com",
    }),
  });
  expect(await verifyTaskToken("Bearer signed")).toBe(true);
  expect(verify).toHaveBeenLastCalledWith({
    idToken: "signed",
    audience: "https://api.example",
  });
  verify.mockRejectedValue(new Error("Invalid signature"));
  expect(await verifyTaskToken("Bearer forged")).toBe(false);
});
