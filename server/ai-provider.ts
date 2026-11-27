import { models } from "../shared/business";
export type ProviderMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};
export function visibleReply(content: string) {
  return content.replace(/<think\b[^>]*>[\s\S]*?(?:<\/think>|$)/gi, "").trim();
}
export async function complete(
  messages: ProviderMessage[],
  options: {
    publicReply?: boolean;
    maxTokens?: number;
    timeoutMs?: number;
    validate?: (content: string) => boolean;
  } = {},
) {
  const key = process.env.FEATHERLESS_API_KEY;
  if (!key)
    throw Object.assign(
      new Error(
        "Geraki is temporarily unavailable. You can still send your brief through Contact.",
      ),
      { status: 503 },
    );
  const preferred = options.publicReply
    ? [models.secondary, models.primary]
    : [models.primary, models.secondary];
  for (const model of preferred) {
    try {
      const response = await fetch(
        "https://api.featherless.ai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages,
            max_tokens:
              options.maxTokens ?? (options.publicReply ? 1200 : 1600),
            chat_template_kwargs: { enable_thinking: false },
            temperature: 0.5,
            stream: false,
          }),
          signal: AbortSignal.timeout(options.timeoutMs ?? 22000),
        },
      );
      if (!response.ok) {
        const category =
          response.status === 401 || response.status === 403
            ? "authentication_or_access"
            : response.status === 429
              ? "throttled"
              : response.status === 404
                ? "model_or_endpoint_unavailable"
                : "provider_error";
        console.warn("AI request failed", {
          model,
          status: response.status,
          category,
        });
        continue;
      }
      const data = await response.json();
      const finishReason = data?.choices?.[0]?.finish_reason;
      if (finishReason === "length" || finishReason === "content_filter") {
        console.warn("AI request failed", { model, category: "incomplete_reply" });
        continue;
      }
      const content = data?.choices?.[0]?.message?.content;
      if (typeof content === "string" && content.length <= 60000) {
        const visible = visibleReply(content);
        if (visible && (!options.validate || options.validate(visible)))
          return { content: visible, model };
      }
      console.warn("AI request failed", { model, category: "invalid_reply" });
    } catch (error) {
      console.warn("AI request failed", {
        model,
        category:
          error instanceof Error &&
          ["TimeoutError", "AbortError"].includes(error.name)
            ? "timeout"
            : "connection_or_format",
      });
    }
  }
  throw Object.assign(
    new Error(
      "Geraki could not connect just now. Please retry or use Contact to reach the team.",
    ),
    { status: 503 },
  );
}
