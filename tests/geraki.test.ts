import { afterEach, describe, expect, it, vi } from "vitest";
import { askGeraki, gerakiInstructions } from "../server/geraki";
import { defaultSettings, models } from "../shared/business";
import { generateArticle } from "../server/generation";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe("Featherless-only routing", () => {
  it.each(["truncated", "invalid JSON", "invalid fields", "unsafe markup"])(
    "tries the other approved model when an article reply has %s",
    async (failure) => {
      vi.stubEnv("FEATHERLESS_API_KEY", "private-test-key");
      const draft = {
        title: "Website planning", excerpt: "A practical guide.",
        body: "Start with one customer task.", category: "Websites",
      };
      const content = failure === "invalid JSON" ? "not JSON"
        : failure === "invalid fields" ? JSON.stringify({ title: "Incomplete" })
        : failure === "unsafe markup" ? JSON.stringify({ ...draft, body: "<script>unsafe</script>" })
        : JSON.stringify(draft);
      const fetcher = vi.fn()
        .mockResolvedValueOnce(new Response(JSON.stringify({ choices: [{
          finish_reason: failure === "truncated" ? "length" : "stop", message: { content },
        }] })))
        .mockResolvedValueOnce(new Response(JSON.stringify({ choices: [{
          finish_reason: "stop", message: { content: JSON.stringify(draft) },
        }] })));
      vi.stubGlobal("fetch", fetcher);
      const reply = await generateArticle({
        id: "topic", title: "Planning", brief: "Help business owners.",
        reference: "", sourceUrl: "", createdAt: new Date().toISOString(),
      }, "topic");
      expect(reply.model).toBe(models.secondary);
      expect(JSON.parse(reply.content)).toEqual(draft);
      expect(fetcher).toHaveBeenCalledTimes(2);
    },
  );
  it("uses MiniMax M3 for private questions and Kimi K3 for public replies", async () => {
    vi.stubEnv("FEATHERLESS_API_KEY", "private-test-key");
    const fetcher = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ choices: [{ message: { content: "Hello." } }] }),
          { status: 200 },
        ),
    );
    vi.stubGlobal("fetch", fetcher);
    await askGeraki([{ role: "user", content: "Hello" }], defaultSettings);
    await askGeraki(
      [{ role: "user", content: "Hello" }],
      defaultSettings,
      true,
    );
    expect(JSON.parse((fetcher.mock.calls[0] as any)[1].body).model).toBe(
      models.primary,
    );
    expect(JSON.parse((fetcher.mock.calls[1] as any)[1].body).model).toBe(
      models.secondary,
    );
    expect((fetcher.mock.calls[0] as any)[0]).toBe(
      "https://api.featherless.ai/v1/chat/completions",
    );
  });
  it("falls back only to the other approved model after an error", async () => {
    vi.stubEnv("FEATHERLESS_API_KEY", "private-test-key");
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response("{}", { status: 429 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ choices: [{ message: { content: "Hello." } }] }),
        ),
      );
    vi.stubGlobal("fetch", fetcher);
    const reply = await askGeraki(
      [{ role: "user", content: "Hello" }],
      defaultSettings,
    );
    expect(reply.model).toBe(models.secondary);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("does not expose hidden thinking in the displayed reply", async () => {
    vi.stubEnv("FEATHERLESS_API_KEY", "private-test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              choices: [
                { message: { content: "<think>internal</think>Hello." } },
              ],
            }),
          ),
      ),
    );
    expect(
      (await askGeraki([{ role: "user", content: "Hello" }], defaultSettings))
        .content,
    ).toBe("Hello.");
  });
  it("keeps approval and prices under business control in the instructions", () => {
    const prompt = gerakiInstructions(defaultSettings);
    expect(prompt).toContain("Never pretend to be human");
    expect(prompt).toContain("do not invent a package or price");
    expect(prompt).toContain("30%");
    expect(prompt).toContain("40%");
    expect(prompt).toContain("₹500");
  });
  it("rejects a thinking-only response and tries the other approved model", async () => {
    vi.stubEnv("FEATHERLESS_API_KEY", "private-test-key");
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [{ message: { content: "<think>internal only" } }],
          }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ choices: [{ message: { content: "Hello." } }] }),
        ),
      );
    vi.stubGlobal("fetch", fetcher);
    const reply = await askGeraki(
      [{ role: "user", content: "Hello" }],
      defaultSettings,
    );
    expect(reply).toEqual({ content: "Hello.", model: models.secondary });
  });
  it("requires a server key and never returns a fake successful response", async () => {
    vi.stubEnv("FEATHERLESS_API_KEY", "");
    await expect(
      askGeraki([{ role: "user", content: "Hello" }], defaultSettings),
    ).rejects.toThrow("temporarily unavailable");
  });
});
