import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { adminDb } from "./firebase-admin";
import { FieldPath, type Transaction } from "firebase-admin/firestore";

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
  ): Promise<{ items: T[]; nextCursor: string | null }>;
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
async function uniqueSlug(
  transaction: Transaction,
  collection: string,
  id: string,
  data: RecordData,
) {
  if (collection !== "content" || typeof data.slug !== "string") return;
  const duplicates = await transaction.get(
    adminDb.collection(collection).where("slug", "==", data.slug).limit(2),
  );
  if (duplicates.docs.some((doc) => doc.id !== id))
    throw Object.assign(new Error("That page address is already used."), {
      status: 409,
    });
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
    if (collection !== "content") {
      const result = await query.limit(500).get();
      return result.docs.map((doc) => ({ ...doc.data(), id: doc.id }) as T);
    }
    // Content must not silently disappear once a studio has over 500 entries.
    const ordered = query.orderBy(FieldPath.documentId());
    const items: T[] = [];
    let cursor: string | undefined;
    for (;;) {
      const page = await (cursor ? ordered.startAfter(cursor) : ordered).limit(500).get();
      items.push(...page.docs.map((doc) => ({ ...doc.data(), id: doc.id }) as T));
      if (page.size < 500) return items;
      cursor = page.docs[page.docs.length - 1].id;
    }
  },
  async page<T extends RecordData>(collection: string, afterId?: string) {
    ready();
    const base = adminDb.collection(collection).orderBy(FieldPath.documentId());
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
        await uniqueSlug(transaction, collection, id, data);
        transaction.set(adminDb.collection(collection).doc(id), data);
      });
    } else await adminDb.collection(collection).doc(id).set(data);
  },
  async remove(collection, id) {
    ready();
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
      await uniqueSlug(transaction, collection, id, next);
      transaction.set(ref, next);
      return next;
    });
  },
};
