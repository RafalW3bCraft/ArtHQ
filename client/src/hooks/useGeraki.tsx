import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { send } from "@/lib/queryClient";

export type ChatMessage = { role: "user" | "assistant"; content: string };
const welcome: ChatMessage = {
  role: "assistant",
  content: "Hi, I’m Geraki, RafalWebCraft’s AI assistant. Tell me what you’d like to build, or what you’d like to make easier. We can figure out the next step together.",
};

function readConversation(): ChatMessage[] {
  try {
    const value = JSON.parse(sessionStorage.getItem("geraki-chat") || "null");
    if (Array.isArray(value) && value.length && value.every((m) =>
      m && ["user", "assistant"].includes(m.role) &&
      typeof m.content === "string" && m.content.trim() && m.content.length <= 12000,
    )) return value.slice(-20);
  } catch { /* Storage may be disabled by the browser. */ }
  return [welcome];
}

// Keep the newest messages within the API's message and character limits.
export function chatContext(messages: ChatMessage[]): ChatMessage[] {
  const result: ChatMessage[] = [];
  let length = 0;
  for (const message of messages.slice(-16).reverse()) {
    const content = message.content.slice(0, 4000);
    if (length + content.length > 18000) break;
    result.unshift({ ...message, content });
    length += content.length;
  }
  return result;
}

function useConversation() {
  const [messages, setMessages] = useState(readConversation);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  useEffect(() => {
    try { sessionStorage.setItem("geraki-chat", JSON.stringify(messages)); } catch {}
  }, [messages]);

  async function request(history: ChatMessage[]) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await send<{ content: string }>("/api/geraki/chat", { messages: chatContext(history) });
      if (typeof result.content !== "string" || !result.content.trim())
        throw new Error("Geraki returned an empty reply. Please try again.");
      setMessages([...history, { role: "assistant" as const, content: result.content }].slice(-20));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Geraki could not connect. Please try again.");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  async function ask(value = input) {
    if (!value.trim() || pending.current) return;
    const history: ChatMessage[] = [...messages, { role: "user" as const, content: value.trim().slice(0, 4000) }].slice(-20);
    setMessages(history);
    setInput("");
    await request(history);
  }
  function clear() {
    if (pending.current) return;
    setMessages([welcome]);
    setError("");
    setInput("");
  }
  return { messages, input, setInput, busy, error, ask, clear, retry: () => request(messages) };
}
const GerakiContext = createContext<ReturnType<typeof useConversation> | null>(null);
export function GerakiProvider({ children }: { children: ReactNode }) {
  const chat = useConversation();
  return <GerakiContext.Provider value={chat}>{children}</GerakiContext.Provider>;
}
export function useGeraki() {
  const chat = useContext(GerakiContext);
  if (!chat) throw new Error("GerakiProvider is required");
  return chat;
}
