import { createHash } from "node:crypto";
import type { BusinessStore } from "./business-store";
export async function takeQuota(
  store: BusinessStore,
  scope: string,
  subject: string,
  limit: number,
) {
  const id = createHash("sha256").update(`${scope}:${subject}`).digest("hex");
  await store.change("ai_limits", id, (current) => {
    const now = Date.now();
    const count =
      current && now - current.windowStart < 60000 ? current.count : 0;
    if (count >= limit)
      throw Object.assign(
        new Error("Please wait a minute before requesting more AI work."),
        { status: 429 },
      );
    return {
      id,
      windowStart: count ? current!.windowStart : now,
      count: count + 1,
      expiresAt: new Date(now + 86400000),
    };
  });
}
