import { Router } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { BusinessStore } from "./business-store";
import {
  feedSchema,
  topicSchema,
  type Feed,
  type GenerationJob,
  type Topic,
} from "../shared/generation";
import { fetchFeed, feedUrl, parseFeed } from "./feeds";
import { jobIdFor } from "./generation";
import { takeQuota } from "./quotas";
const id = z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/);
const now = () => new Date().toISOString();
export function generationApi(
  store: BusinessStore,
  enqueue: (jobId: string) => Promise<void>,
  readFeed = fetchFeed,
) {
  const router = Router();
  for (const [route, collection] of [
    ["topics", "generation_topics"],
    ["feeds", "generation_feeds"],
    ["candidates", "news_candidates"],
    ["jobs", "generation_jobs"],
  ]) {
    router.get(`/${route}`, async (req, res) => {
      const cursor = z.string().max(1500).optional().parse(req.query.cursor);
      res.json(await store.page(collection, cursor));
    });
  }
  router.post("/topics", async (req, res) => {
    const value = topicSchema.parse(req.body);
    const topic: Topic = { id: randomUUID(), ...value, createdAt: now() };
    await store.put("generation_topics", topic.id, topic);
    res.status(201).json(topic);
  });
  router.post("/feeds", async (req, res) => {
    const value = feedSchema.parse(req.body);
    value.url = feedUrl(value.url).href;
    const feed: Feed = { id: randomUUID(), ...value, createdAt: now() };
    await store.put("generation_feeds", feed.id, feed);
    res.status(201).json(feed);
  });
  router.put("/feeds/:id", async (req, res) => {
    const feedId = id.parse(req.params.id);
    const value = feedSchema.parse(req.body);
    value.url = feedUrl(value.url).href;
    const feed = await store.change<Feed>(
      "generation_feeds",
      feedId,
      (current) => {
        if (!current)
          throw Object.assign(new Error("Feed not found."), { status: 404 });
        return { ...current, ...value };
      },
    );
    res.json(feed);
  });
  router.post("/feeds/:id/poll", async (req, res) => {
    const feed = await store.get<Feed>(
      "generation_feeds",
      id.parse(req.params.id),
    );
    if (!feed?.enabled)
      return res.status(409).json({ error: "Enable the feed before polling." });
    await takeQuota(store, "feed_poll", res.locals.identity.uid, 6);
    try {
      const candidates = parseFeed(await readFeed(feed.url), feed.id, feed.url);
      let imported = 0;
      for (const candidate of candidates) {
        let created = false;
        await store.change("news_candidates", candidate.id, (current) => {
          created = !current;
          return current || candidate;
        });
        if (created) imported++;
      }
      res.json({ imported, examined: candidates.length });
    } catch (error) {
      console.warn("Feed polling failed", { feedId: feed.id });
      res
        .status((error as any)?.status === 400 ? 400 : 502)
        .json({
          error:
            "Could not read this feed. Check that it is a public HTTPS RSS or Atom source.",
        });
    }
  });
  async function enqueueJob(jobId: string) {
    try {
      await enqueue(jobId);
    } catch {
      await store.change<GenerationJob>("generation_jobs", jobId, (current) => {
        if (!current) throw new Error("Job not found.");
        return current.state === "queued"
          ? {
              ...current,
              state: "failed",
              error:
                "Could not enqueue generation. Check task queue configuration and retry.",
              updatedAt: now(),
            }
          : current;
      });
      throw Object.assign(
        new Error(
          "Could not queue the draft. Check task queue configuration and retry from Jobs.",
        ),
        { status: 503 },
      );
    }
  }
  router.post("/jobs", async (req, res) => {
    const value = z
      .object({
        sourceKind: z.enum(["topic", "news"]),
        sourceIds: z.array(id).min(1).max(3),
      })
      .strict()
      .parse(req.body);
    const sourceIds = [...new Set(value.sourceIds)];
    for (const sourceId of sourceIds)
      if (
        !(await store.get(
          value.sourceKind === "topic"
            ? "generation_topics"
            : "news_candidates",
          sourceId,
        ))
      )
        return res.status(404).json({ error: "Article source not found." });
    await takeQuota(store, "generation", res.locals.identity.uid, 3);
    const jobs: GenerationJob[] = [];
    for (const sourceId of sourceIds) {
      const jobId = jobIdFor(value.sourceKind, sourceId);
      let created = false;
      const job = await store.change<GenerationJob>(
        "generation_jobs",
        jobId,
        (current) => {
          created = !current;
          return (
            current || {
              id: jobId,
              sourceKind: value.sourceKind,
              sourceId,
              state: "queued",
              attempts: 0,
              error: "",
              createdAt: now(),
              updatedAt: now(),
            }
          );
        },
      );
      if (created) await enqueueJob(jobId);
      jobs.push(job);
    }
    res.status(202).json({ jobs });
  });
  router.get("/jobs/:id", async (req, res) => {
    const job = await store.get("generation_jobs", id.parse(req.params.id));
    if (!job) return res.status(404).json({ error: "Job not found." });
    res.json(job);
  });
  router.post("/jobs/:id/retry", async (req, res) => {
    await takeQuota(store, "generation", res.locals.identity.uid, 3);
    const jobId = id.parse(req.params.id);
    const job = await store.change<GenerationJob>(
      "generation_jobs",
      jobId,
      (current) => {
        if (!current)
          throw Object.assign(new Error("Job not found."), { status: 404 });
        if (
          current.state !== "failed" &&
          !(
            current.state === "running" &&
            (current.leaseUntil || 0) < Date.now()
          ) &&
          !(
            current.state === "queued" &&
            Date.now() - Date.parse(current.updatedAt) > 180000
          )
        )
          throw Object.assign(
            new Error("Only failed or interrupted jobs can be retried."),
            { status: 409 },
          );
        return {
          ...current,
          state: "queued",
          attempts: 0,
          lease: "",
          leaseUntil: 0,
          error: "",
          updatedAt: now(),
        };
      },
    );
    await enqueueJob(jobId);
    res.status(202).json(job);
  });
  return router;
}
