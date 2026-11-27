import { EventEmitter } from "node:events";
import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ lookup: vi.fn(), get: vi.fn() }));
vi.mock("node:dns/promises", () => ({ lookup: mocks.lookup }));
vi.mock("node:https", () => ({ default: { get: mocks.get } }));
import { fetchFeed } from "../server/feeds";
beforeEach(() => vi.clearAllMocks());
it("blocks metadata and mixed public/private DNS answers before opening a socket", async () => {
  for (const addresses of [
    [{ address: "169.254.169.254", family: 4 }],
    [
      { address: "8.8.8.8", family: 4 },
      { address: "127.0.0.1", family: 4 },
    ],
  ]) {
    mocks.lookup.mockResolvedValueOnce(addresses);
    await expect(fetchFeed("https://feed.example/rss")).rejects.toThrow(
      "public internet",
    );
  }
  expect(mocks.get).not.toHaveBeenCalled();
});
it("pins the validated address and revalidates every redirect destination", async () => {
  mocks.lookup
    .mockResolvedValueOnce([{ address: "8.8.8.8", family: 4 }])
    .mockResolvedValueOnce([{ address: "127.0.0.1", family: 4 }]);
  mocks.get.mockImplementation((_url, options, callback) => {
    const lookupCallback = vi.fn();
    options.lookup("feed.example", {}, lookupCallback);
    expect(lookupCallback).toHaveBeenCalledWith(null, "8.8.8.8", 4);
    const response = Object.assign(new EventEmitter(), {
      statusCode: 302,
      headers: { location: "https://private.example/rss" },
      resume: vi.fn(),
    });
    queueMicrotask(() => callback(response));
    return Object.assign(new EventEmitter(), { destroy: vi.fn() });
  });
  await expect(fetchFeed("https://feed.example/rss")).rejects.toThrow(
    "public internet",
  );
  expect(mocks.get).toHaveBeenCalledTimes(1);
});
