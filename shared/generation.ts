import { z } from "zod";
import { safeUrl, type Content } from "./business";
const text = (max: number) => z.string().trim().min(1).max(max);
export const topicSchema = z
  .object({
    title: text(160),
    brief: text(6000),
    reference: z.string().trim().max(12000).default(""),
    sourceUrl: safeUrl.or(z.literal("")).default(""),
  })
  .strict();
export const feedSchema = z
  .object({ name: text(100), url: safeUrl.max(2000), enabled: z.boolean() })
  .strict();
export type Topic = z.infer<typeof topicSchema> & {
  id: string;
  createdAt: string;
};
export type Feed = z.infer<typeof feedSchema> & {
  id: string;
  createdAt: string;
};
export type NewsCandidate = {
  id: string;
  feedId: string;
  title: string;
  summary: string;
  sourceUrl: string;
  sourceDate: string;
  createdAt: string;
};
export type GenerationJob = {
  id: string;
  sourceKind: "topic" | "news";
  sourceId: string;
  state: "queued" | "running" | "failed" | "complete";
  attempts: number;
  lease?: string;
  leaseUntil?: number;
  error: string;
  contentId?: string;
  model?: string;
  createdAt: string;
  updatedAt: string;
};
export type Page<T> = { items: T[]; nextCursor: string | null };
export type GeneratedDraft = Pick<
  Content,
  "title" | "excerpt" | "body" | "category"
>;
export const generatedDraftSchema = z
  .object({
    title: text(160),
    excerpt: text(400),
    body: text(30000),
    category: text(80),
  })
  .strict();
