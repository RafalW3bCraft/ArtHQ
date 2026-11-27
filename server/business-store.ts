import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { adminDb } from "./firebase-admin";
import { FieldPath, type Transaction } from "firebase-admin/firestore";
import { createHash } from "node:crypto";
import type { Content } from "../shared/business";
import type { GenerationJob } from "../shared/generation";

export type RecordData = Record<string, any> & { id: string };
export interface BusinessStore {
  get<T extends RecordData>(collection: string, id: string): Promise<T | null>;
  list<T extends RecordData>(
    collection: string,
    field?: string,
    value?: unknown,
  ): Promise<T[]>;
  page<T extends RecordData>(
    collection: string,
    afterId?: string,
    filter?: { field: string; value: unknown },
  ): Promise<{ items: T[]; nextCursor: string | null }>;
  completeGeneration?(
    jobId: string,
    lease: string,
    content: Content,
    model: string,
  ): Promise<void>;
  put<T extends RecordData>(
    collection: string,
    id: string,
    data: T,
  ): Promise<void>;
  remove(collection: string, id: string): Promise<void>;
  change<T extends RecordData>(
    collection: string,
    id: string,
    update: (current: T | null) => T,
  ): Promise<T>;
}
export const databaseConfigured = () =>
  Boolean(
    process.env.FIRESTORE_EMULATOR_HOST ||
      process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
      process.env.GOOGLE_APPLICATION_CREDENTIALS ||
      process.env.K_SERVICE ||
      existsSync(
        `${homedir()}/.config/gcloud/application_default_credentials.json`,
      ),
  );
function ready() {
  if (!databaseConfigured())
    throw Object.assign(
      new Error(
        "Storage is not configured. Contact us by email while setup is completed.",
      ),
      { status: 503 },
    );
}
async function ownedSlugReservation(
  transaction: Transaction,
  slug: unknown,
  id: string,
) {
  if (typeof slug !== "string") return null;
  const ref = adminDb
    .collection("content_slugs")
    .doc(createHash("sha256").update(slug).digest("hex"));
  const doc = await transaction.get(ref);
  return doc.exists && doc.data()?.ownerId === id ? ref : null;
}
async function uniqueSlug(
  transaction: Transaction,
  collection: string,
  id: string,
  data: RecordData,
) {
  if (collection !== "content" || typeof data.slug !== "string") return;
  const reservation = adminDb
    .collection("content_slugs")
    .doc(createHash("sha256").update(data.slug).digest("hex"));
  const reserved = await transaction.get(reservation);
  if (reserved.exists && reserved.data()?.ownerId !== id)
    throw Object.assign(new Error("That page address is already used."), {
      status: 409,
    });
  const duplicates = await transaction.get(
    adminDb.collection(collection).where("slug", "==", data.slug).limit(2),
  );
  if (duplicates.docs.some((doc) => doc.id !== id))
    throw Object.assign(new Error("That page address is already used."), {
      status: 409,
    });
  return () => transaction.set(reservation, { ownerId: id, slug: data.slug });
}
export const businessStore: BusinessStore = {
  async get<T extends RecordData>(collection: string, id: string) {
    ready();
    const doc = await adminDb.collection(collection).doc(id).get();
    return doc.exists ? ({ ...doc.data(), id: doc.id } as T) : null;
  },
  async list<T extends RecordData>(
    collection: string,
    field?: string,
    value?: unknown,
  ) {
    ready();
    const col = adminDb.collection(collection);
    const query = field ? col.where(field, "==", value) : col;
    // Content must not silently disappear once a studio has over 500 entries.
    const ordered = query.orderBy(FieldPath.documentId());
    const items: T[] = [];
    let cursor: string | undefined;
    for (;;) {
      const page = await (cursor ? ordered.startAfter(cursor) : ordered)
        .limit(500)
        .get();
      items.push(
        ...page.docs.map((doc) => ({ ...doc.data(), id: doc.id }) as T),
      );
      if (page.size < 500) return items;
      cursor = page.docs[page.docs.length - 1].id;
    }
  },
  async page<T extends RecordData>(
    collection: string,
    afterId?: string,
    filter?: { field: string; value: unknown },
  ) {
    ready();
    const col = adminDb.collection(collection);
    const base = (
      filter ? col.where(filter.field, "==", filter.value) : col
    ).orderBy(FieldPath.documentId());
    const query = afterId ? base.startAfter(afterId) : base;
    const result = await query.limit(101).get();
    const docs = result.docs.slice(0, 100);
    return {
      items: docs.map((doc) => ({ ...doc.data(), id: doc.id }) as T),
      nextCursor: result.size > 100 ? docs[docs.length - 1].id : null,
    };
  },
  async put(collection, id, data) {
    ready();
    if (collection === "content") {
      await adminDb.runTransaction(async (transaction) => {
        const ref = adminDb.collection(collection).doc(id);
        const previous = await transaction.get(ref);
        const old =
          previous.exists && previous.data()?.slug !== data.slug
            ? await ownedSlugReservation(transaction, previous.data()?.slug, id)
            : null;
        const reserve = await uniqueSlug(transaction, collection, id, data);
        if (old) transaction.delete(old);
        reserve?.();
        transaction.set(adminDb.collection(collection).doc(id), data);
      });
    } else await adminDb.collection(collection).doc(id).set(data);
  },
  async remove(collection, id) {
    ready();
    if (collection === "content") {
      await adminDb.runTransaction(async (transaction) => {
        const ref = adminDb.collection(collection).doc(id);
        const doc = await transaction.get(ref);
        const slug = doc.data()?.slug;
        const reservation = await ownedSlugReservation(transaction, slug, id);
        if (reservation) transaction.delete(reservation);
        transaction.delete(ref);
      });
      return;
    }
    await adminDb.collection(collection).doc(id).delete();
  },
  async change<T extends RecordData>(
    collection: string,
    id: string,
    update: (current: T | null) => T,
  ) {
    ready();
    const ref = adminDb.collection(collection).doc(id);
    return adminDb.runTransaction(async (transaction) => {
      const doc = await transaction.get(ref);
      const next = update(
        doc.exists ? ({ ...doc.data(), id: doc.id } as T) : null,
      );
      const oldSlug = doc.exists ? doc.data()?.slug : undefined;
      const old =
        collection === "content" && oldSlug !== next.slug
          ? await ownedSlugReservation(transaction, oldSlug, id)
          : null;
      const reserve = await uniqueSlug(transaction, collection, id, next);
      if (old) transaction.delete(old);
      reserve?.();
      transaction.set(ref, next);
      return next;
    });
  },
  async completeGeneration(jobId, lease, content, model) {
    ready();
    await adminDb.runTransaction(async (transaction) => {
      const jobRef = adminDb.collection("generation_jobs").doc(jobId);
      const contentRef = adminDb.collection("content").doc(content.id);
      const [jobDoc, contentDoc] = await Promise.all([
        transaction.get(jobRef),
        transaction.get(contentRef),
      ]);
      const job = jobDoc.data() as GenerationJob | undefined;
      if (!job || job.state !== "running" || job.lease !== lease)
        throw new Error("Generation lease changed.");
      const reserve = contentDoc.exists
        ? undefined
        : await uniqueSlug(transaction, "content", content.id, content);
      reserve?.();
      if (!contentDoc.exists) transaction.set(contentRef, content);
      transaction.set(jobRef, {
        ...job,
        state: "complete",
        error: "",
        contentId: content.id,
        model,
        leaseUntil: 0,
        updatedAt: new Date().toISOString(),
      });
    });
  },
};
