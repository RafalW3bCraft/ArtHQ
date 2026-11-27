import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApplication } from "../server/business-api";
import { MemoryStore } from "./helpers/store";
import { defaultSettings } from "../shared/business";
import { runGeneration } from "../server/generation";
import { parseFeed, publicAddress, feedUrl } from "../server/feeds";
let store: MemoryStore;
const verify = async (token: string) =>
  token === "admin"
    ? { uid: "admin", admin: true, email_verified: true }
    : { uid: token, email_verified: true };
const article = {
  title: "Practical website planning",
  excerpt: "A practical guide.",
  category: "Websites",
  body: "Start with your business goals.\n\nTalk to your customers before choosing features.",
};
const generate = vi.fn(async () => ({
  content: JSON.stringify(article),
  model: "MiniMaxAI/MiniMax-M3",
}));
const enqueue = vi.fn(async () => {});
const rss = `<rss version="2.0"><channel><item><title>Business update</title><link>https://example.com/news</link><description><![CDATA[<p>A sourced announcement.</p>]]></description><pubDate>Wed, 25 Nov 2026 10:00:00 GMT</pubDate></item></channel></rss>`;
const app = () =>
  createApplication({
    store,
    verify,
    enqueue,
    generate,
    storageReady: () => true,
    taskVerify: async (token) => token === "Bearer worker",
    readFeed: async () => rss,
    ai: async () => ({ content: "Hello", model: "MiniMaxAI/MiniMax-M3" }),
  });
beforeEach(async () => {
  store = new MemoryStore();
  vi.clearAllMocks();
  generate.mockResolvedValue({
    content: JSON.stringify(article),
    model: "MiniMaxAI/MiniMax-M3",
  });
  await store.put("business_settings", "public", {
    id: "public",
    ...defaultSettings,
  });
});
afterEach(() => vi.unstubAllEnvs());
const post = (server: ReturnType<typeof app>, url: string, body: any) =>
  request(server).post(url).set("Authorization", "Bearer admin").send(body);
async function topicJob(server = app()) {
  const topic = await post(server, "/api/admin/generation/topics", {
    title: "Website planning",
    brief: "Help business owners choose a scope.",
  });
  expect(topic.status).toBe(201);
  const result = await post(server, "/api/admin/generation/jobs", {
    sourceKind: "topic",
    sourceIds: [topic.body.id],
  });
  expect(result.status).toBe(202);
  return { server, topic: topic.body, job: result.body.jobs[0] };
}
describe("runtime and authorization repairs", () => {
  it("returns JSON on rate limiting and never echoes malformed request content", async () => {
    const server = app();
    let result;
    for (let i = 0; i < 121; i++)
      result = await request(server).get("/api/site");
    expect(result!.status).toBe(429);
    expect(result!.headers["content-type"]).toContain("application/json");
    const malformed = await request(app())
      .post("/api/contact")
      .set("Content-Type", "application/json")
      .send('{"private":"never-echo"');
    expect(malformed.status).toBe(400);
    expect(malformed.text).not.toContain("never-echo");
  });
  it("denies ordinary users and unsigned workers before generation", async () => {
    const server = app();
    expect(
      (await request(server).get("/api/admin/generation/jobs")).status,
    ).toBe(401);
    expect(
      (
        await request(server)
          .get("/api/admin/generation/topics")
          .set("Authorization", "Bearer client")
      ).status,
    ).toBe(403);
    expect(
      (await request(server).post("/internal/generation/job").send({})).status,
    ).toBe(401);
    expect(generate).not.toHaveBeenCalled();
  });
  it("enforces the shared AI quota across application instances", async () => {
    const first = app(),
      second = app();
    for (let i = 0; i < 12; i++)
      expect(
        (
          await request(i < 6 ? first : second)
            .post("/api/geraki/chat")
            .send({ messages: [{ role: "user", content: "Hello" }] })
        ).status,
      ).toBe(200);
    expect(
      (
        await request(second)
          .post("/api/geraki/chat")
          .send({ messages: [{ role: "user", content: "Hello" }] })
      ).status,
    ).toBe(429);
  });
  it("pages orders without returning another customer's records", async () => {
    for (let i = 0; i < 105; i++)
      await store.put("orders", `a${String(i).padStart(3, "0")}`, {
        id: `a${String(i).padStart(3, "0")}`,
        clientId: "client",
      });
    await store.put("orders", "other", { id: "other", clientId: "other" });
    const server = app();
    const first = await request(server)
      .get("/api/orders")
      .set("Authorization", "Bearer client")
      .set("X-List-Pagination", "cursor");
    expect(first.body.items).toHaveLength(100);
    const second = await request(server)
      .get(`/api/orders?cursor=${first.body.nextCursor}`)
      .set("Authorization", "Bearer client")
      .set("X-List-Pagination", "cursor");
    expect(second.body.items).toHaveLength(5);
    expect(second.body.nextCursor).toBeNull();
    expect(
      [...first.body.items, ...second.body.items].every(
        (x) => x.clientId === "client",
      ),
    ).toBe(true);
  });
  it("suppresses replies whose parent was hidden while inference was running", async () => {
    const server = createApplication({
      store,
      verify,
      storageReady: () => true,
      ai: async () => {
        const parent = (await store.list("messages"))[0];
        await store.put("messages", parent.id, { ...parent, status: "hidden" });
        return {
          content: "This must not appear",
          model: "MiniMaxAI/MiniMax-M3",
        };
      },
    });
    const result = await request(server)
      .post("/api/messages")
      .set("Authorization", "Bearer client")
      .send({ content: "A question", context: "community", askGeraki: true });
    expect(result.status).toBe(201);
    expect(await store.list("messages")).toHaveLength(1);
    expect(
      (await request(server).get("/api/messages?context=community")).body,
    ).toEqual([]);
  });
});
describe("reviewed article generation", () => {
  it("creates exactly one private draft under duplicate delivery and preserves editorial changes", async () => {
    const { server, topic, job } = await topicJob();
    const duplicate = await post(server, "/api/admin/generation/jobs", {
      sourceKind: "topic",
      sourceIds: [topic.id],
    });
    expect(duplicate.body.jobs[0].id).toBe(job.id);
    expect(enqueue).toHaveBeenCalledTimes(1);
    const [first, second] = await Promise.all([
      request(server)
        .post(`/internal/generation/${job.id}`)
        .set("Authorization", "Bearer worker")
        .send({}),
      request(server)
        .post(`/internal/generation/${job.id}`)
        .set("Authorization", "Bearer worker")
        .send({}),
    ]);
    expect([200, 503]).toContain(first.status);
    expect([200, 503]).toContain(second.status);
    const drafts = await store.list("content");
    expect(drafts).toHaveLength(1);
    expect(drafts[0].published).toBe(false);
    expect(generate).toHaveBeenCalledTimes(1);
    await store.put("content", drafts[0].id, {
      ...drafts[0],
      body: "Reviewed text",
      published: true,
    });
    await runGeneration(store, job.id, generate);
    expect((await store.get("content", drafts[0].id))!.body).toBe(
      "Reviewed text",
    );
    expect(generate).toHaveBeenCalledTimes(1);
  });
  it("records queue failure and allows an explicit safe retry", async () => {
    enqueue.mockRejectedValueOnce(new Error("sensitive transport details"));
    const server = app();
    const topic = await post(server, "/api/admin/generation/topics", {
      title: "Planning",
      brief: "Advice for business owners",
    });
    const result = await post(server, "/api/admin/generation/jobs", {
      sourceKind: "topic",
      sourceIds: [topic.body.id],
    });
    expect(result.status).toBe(503);
    expect(result.text).not.toContain("sensitive");
    const job = (await store.list("generation_jobs"))[0];
    expect(job.state).toBe("failed");
    expect(
      (await post(server, `/api/admin/generation/jobs/${job.id}/retry`, {}))
        .status,
    ).toBe(202);
  });
  it("bounds automatic attempts and rejects invalid model output without creating content", async () => {
    const { job } = await topicJob();
    generate.mockResolvedValue({
      content: '{"title":"invented"}',
      model: "MiniMaxAI/MiniMax-M3",
    });
    for (let i = 0; i < 3; i++)
      await runGeneration(store, job.id, generate).catch(() => {});
    await runGeneration(store, job.id, generate);
    expect(generate).toHaveBeenCalledTimes(3);
    expect(await store.list("content")).toHaveLength(0);
    expect((await store.get("generation_jobs", job.id))!.state).toBe("failed");
  });
  it("imports feed items once and retains source attribution in the resulting draft", async () => {
    const server = app();
    const feed = await post(server, "/api/admin/generation/feeds", {
      name: "Approved source",
      url: "https://example.com/feed.xml",
      enabled: true,
    });
    expect(
      (
        await post(
          server,
          `/api/admin/generation/feeds/${feed.body.id}/poll`,
          {},
        )
      ).body.imported,
    ).toBe(1);
    expect(
      (
        await post(
          server,
          `/api/admin/generation/feeds/${feed.body.id}/poll`,
          {},
        )
      ).body.imported,
    ).toBe(0);
    const candidate = (await store.list("news_candidates"))[0];
    const result = await post(server, "/api/admin/generation/jobs", {
      sourceKind: "news",
      sourceIds: [candidate.id],
    });
    await runGeneration(store, result.body.jobs[0].id, generate);
    const draft = (await store.list("content"))[0];
    expect(draft.sourceUrl).toBe("https://example.com/news");
    expect(draft.body).toContain("2026-11-25");
    expect(draft.published).toBe(false);
  });
});
describe("feed security", () => {
  it.each([
    "127.0.0.1",
    "10.0.0.1",
    "169.254.169.254",
    "100.100.100.200",
    "192.168.1.1",
    "::1",
    "::ffff:127.0.0.1",
    "fc00::1",
    "2002:7f00:1::",
  ])("rejects nonpublic destination %s", (ip) =>
    expect(publicAddress(ip)).toBe(false),
  );
  it.each(["8.8.8.8", "2606:4700:4700::1111"])(
    "permits public destination %s",
    (ip) => expect(publicAddress(ip)).toBe(true),
  );
  it("rejects credentials, custom ports, entities and malformed XML", () => {
    expect(() => feedUrl("https://user:password@example.com/feed")).toThrow();
    expect(() => feedUrl("https://example.com:8080/feed")).toThrow();
    expect(() =>
      parseFeed(
        '<!DOCTYPE rss [<!ENTITY x SYSTEM "file:///etc/passwd">]><rss/>',
        "feed",
        "https://example.com",
      ),
    ).toThrow();
    expect(() => parseFeed("<rss>", "feed", "https://example.com")).toThrow();
  });
  it("parses Atom and limits polling to the 20 newest entries", () => {
    const entries = Array.from(
      { length: 25 },
      (_, i) =>
        `<entry><title>News ${i}</title><link rel="alternate" href="https://example.com/${i}"/><summary>Summary</summary><updated>2026-11-${String(i + 1).padStart(2, "0")}T00:00:00Z</updated></entry>`,
    ).join("");
    const items = parseFeed(
      `<feed xmlns="http://www.w3.org/2005/Atom">${entries}</feed>`,
      "feed",
      "https://example.com/feed",
    );
    expect(items).toHaveLength(20);
    expect(items[0].title).toBe("News 24");
  });
});
