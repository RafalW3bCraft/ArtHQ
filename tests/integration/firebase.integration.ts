import { beforeEach, afterAll, expect, it, vi } from "vitest";
import request from "supertest";
import { businessStore as store } from "../../server/business-store";
import { adminDb, adminAuth } from "../../server/firebase-admin";
import { createApplication } from "../../server/business-api";
import { defaultSettings, type Content } from "../../shared/business";
import { jobIdFor, runGeneration } from "../../server/generation";
if (
  !process.env.FIRESTORE_EMULATOR_HOST ||
  !process.env.FIREBASE_AUTH_EMULATOR_HOST ||
  !process.env.FIREBASE_PROJECT_ID?.startsWith("demo-")
)
  throw new Error(
    "Integration tests require demo Firebase emulators. Use pnpm test:emulators.",
  );
const project = process.env.FIREBASE_PROJECT_ID;
const content = (id: string): Content => ({
  id,
  title: "Concurrent article",
  slug: "concurrent-page",
  kind: "article",
  excerpt: "A test article",
  body: "Test body",
  category: "Test",
  published: false,
  featured: false,
  order: 0,
  imageUrl: "",
  liveUrl: "",
  sourceUrl: "",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});
beforeEach(async () => {
  const r = await fetch(
    `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${project}/databases/(default)/documents`,
    { method: "DELETE" },
  );
  if (!r.ok) throw new Error("Could not clear demo emulator.");
});
afterAll(async () => {
  await adminDb.terminate();
});
it("reserves unique slugs under real concurrent Firestore transactions and releases them on rename/delete", async () => {
  const results = await Promise.allSettled([
    store.put("content", "first", content("first")),
    store.put("content", "second", content("second")),
  ]);
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  const winner = (await store.list<Content>("content"))[0];
  await store.put("content", winner.id, { ...winner, slug: "renamed-page" });
  await store.put("content", "third", content("third"));
  await store.remove("content", "third");
  await store.put("content", "fourth", content("fourth"));
  expect((await store.get("content", "fourth"))?.slug).toBe("concurrent-page");
});
it("creates only one provider payment order when two clients click concurrently", async () => {
  await store.put("business_settings", "public", {
    id: "public",
    ...defaultSettings,
    termsApproved: true,
    businessAddress: "Test address",
    refundPolicy: "Test terms",
  });
  await store.put("orders", "project", {
    id: "project",
    clientId: "client",
    status: "booking",
    payments: { booking: { amount: 50000, state: "ready" } },
    updatedAt: new Date().toISOString(),
  });
  const provider = vi.fn(async () => ({
    id: "order_test",
    amount: 50000,
    currency: "INR",
  }));
  const app = createApplication({
    store,
    storageReady: () => true,
    paymentReady: () => true,
    verify: async () => ({ uid: "client" }),
    provider,
  });
  const replies = await Promise.all(
    [1, 2].map(() =>
      request(app)
        .post("/api/orders/project/pay/booking")
        .set("Authorization", "Bearer test")
        .send({}),
    ),
  );
  expect(provider).toHaveBeenCalledTimes(1);
  expect(replies.every((r) => [200, 409].includes(r.status))).toBe(true);
  expect(
    (await store.get("orders", "project"))?.payments.booking.providerOrderId,
  ).toBe("order_test");
});
it("fences concurrent generation and never overwrites the saved draft on redelivery", async () => {
  const sourceId = "topic";
  const jobId = jobIdFor("topic", sourceId);
  const now = new Date().toISOString();
  await store.put("generation_topics", sourceId, {
    id: sourceId,
    title: "Planning",
    brief: "Business advice",
    reference: "",
    sourceUrl: "",
    createdAt: now,
  });
  await store.put("generation_jobs", jobId, {
    id: jobId,
    sourceKind: "topic",
    sourceId,
    state: "queued",
    attempts: 0,
    error: "",
    createdAt: now,
    updatedAt: now,
  });
  const generate = vi.fn(async () => ({
    model: "MiniMaxAI/MiniMax-M3",
    content: JSON.stringify({
      title: "Planning a website",
      excerpt: "A useful guide",
      body: "Choose a business goal first.",
      category: "Websites",
    }),
  }));
  await Promise.allSettled([
    runGeneration(store, jobId, generate),
    runGeneration(store, jobId, generate),
  ]);
  expect(generate).toHaveBeenCalledTimes(1);
  expect(await store.list("content")).toHaveLength(1);
  const job = (await store.get("generation_jobs", jobId))!;
  expect(job.state).toBe("complete");
  await store.change<Content>("content", job.contentId, (current) => ({
    ...current!,
    body: "Human reviewed body",
    published: true,
  }));
  await runGeneration(store, jobId, generate);
  expect((await store.get("content", job.contentId))?.body).toBe(
    "Human reviewed body",
  );
});
it("verifies real emulator identity, denies cross-user orders and blocks direct database access", async () => {
  async function signup(email: string) {
    const r = await fetch(
      `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=test`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password: "test-only-password",
          returnSecureToken: true,
        }),
      },
    );
    if (!r.ok) throw new Error("Auth emulator signup failed");
    return r.json();
  }
  const user = await signup(`client-${Date.now()}@example.test`);
  const other = await signup(`other-${Date.now()}@example.test`);
  expect((await adminAuth.verifyIdToken(user.idToken, true)).uid).toBe(
    user.localId,
  );
  await store.put("orders", "private-project", {
    id: "private-project",
    clientId: user.localId,
  });
  const app = createApplication({ store });
  expect(
    (
      await request(app)
        .get("/api/orders")
        .set("Authorization", `Bearer ${user.idToken}`)
    ).body,
  ).toHaveLength(1);
  expect(
    (
      await request(app)
        .get("/api/orders")
        .set("Authorization", `Bearer ${other.idToken}`)
    ).body,
  ).toHaveLength(0);
  expect(
    (
      await request(app)
        .get("/api/admin/overview")
        .set("Authorization", `Bearer ${user.idToken}`)
    ).status,
  ).toBe(403);
  const direct = await fetch(
    `http://${process.env.FIRESTORE_EMULATOR_HOST}/v1/projects/${project}/databases/(default)/documents/orders/private-project`,
    { headers: { Authorization: `Bearer ${user.idToken}` } },
  );
  expect([401, 403]).toContain(direct.status);
});
