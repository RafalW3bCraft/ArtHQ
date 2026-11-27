import { beforeEach, afterEach, expect, it, vi } from "vitest";
const db = vi.hoisted(() => ({ runTransaction: vi.fn(), collection: vi.fn() }));
vi.mock("../server/firebase-admin", () => ({ adminDb: db }));
import { businessStore } from "../server/business-store";
beforeEach(() => {
  vi.stubEnv("FIRESTORE_EMULATOR_HOST", "localhost:8080");
  vi.clearAllMocks();
});
afterEach(() => vi.unstubAllEnvs());
it("rejects a concurrent slug conflict within the Firestore transaction without writing", async () => {
  const query = { limit: vi.fn().mockReturnThis() };
  db.collection.mockReturnValue({
    where: vi.fn().mockReturnValue(query),
    doc: vi.fn().mockReturnValue({}),
  });
  const transaction = {
    get: vi.fn().mockResolvedValue({ docs: [{ id: "other-article" }] }),
    set: vi.fn(),
  };
  db.runTransaction.mockImplementation((callback) => callback(transaction));
  await expect(
    businessStore.put("content", "new-article", {
      id: "new-article",
      slug: "shared-slug",
    }),
  ).rejects.toMatchObject({ status: 409 });
  expect(transaction.set).not.toHaveBeenCalled();
});
it("allows the existing article to retain its own slug", async () => {
  const query = { limit: vi.fn().mockReturnThis() };
  db.collection.mockReturnValue({
    where: vi.fn().mockReturnValue(query),
    doc: vi.fn().mockReturnValue({}),
  });
  const transaction = {
    get: vi.fn().mockResolvedValue({ docs: [{ id: "article" }] }),
    set: vi.fn(),
  };
  db.runTransaction.mockImplementation((callback) => callback(transaction));
  await businessStore.put("content", "article", {
    id: "article",
    slug: "shared-slug",
  });
  expect(transaction.set).toHaveBeenCalledTimes(2);
  expect(transaction.set).toHaveBeenCalledWith(expect.anything(), { ownerId: "article", slug: "shared-slug" });
});

it("returns content after the first 500 records without dropping the filter", async () => {
  const docs = (start: number, count: number) => Array.from({ length: count }, (_, i) => ({
    id: `article-${String(start + i).padStart(4, "0")}`,
    data: () => ({ published: true, title: `Article ${start + i}` }),
  }));
  const query = {
    orderBy: vi.fn().mockReturnThis(),
    startAfter: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    get: vi.fn().mockResolvedValueOnce({ docs: docs(0, 500), size: 500 })
      .mockResolvedValueOnce({ docs: docs(500, 2), size: 2 }),
  };
  const where = vi.fn().mockReturnValue(query);
  db.collection.mockReturnValue({ where });
  const result = await businessStore.list("content", "published", true);
  expect(where).toHaveBeenCalledWith("published", "==", true);
  expect(result).toHaveLength(502);
  expect(result.at(-1)?.id).toBe("article-0501");
  expect(query.startAfter).toHaveBeenCalledWith("article-0499");
});
