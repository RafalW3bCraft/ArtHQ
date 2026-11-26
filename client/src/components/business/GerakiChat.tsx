import { useEffect, useId, useRef } from "react";
import { Link } from "wouter";
import { ArrowUpRight, Maximize2, RotateCcw, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useGeraki } from "@/hooks/useGeraki";

export function GerakiChat({ close }: { close?: () => void }) {
  const { messages, input, setInput, busy, error, ask, clear, retry } = useGeraki();
  const transcript = useRef<HTMLDivElement>(null);
  const inputId = useId();
  useEffect(() => {
    const element = transcript.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [messages, busy]);
  return (
    <div className="assistant-window">
      <div className="assistant-header">
        <span className="mini-brand">g.</span>
        <div><strong>Geraki</strong><span>Your AI project assistant</span></div>
        <button className="icon-button" aria-label="Clear conversation" disabled={busy} onClick={clear}>
          <RotateCcw size={18} />
        </button>
        {close && <>
          <Link href="/start" className="icon-button" aria-label="Open full conversation" onClick={close}><Maximize2 size={18} /></Link>
          <button className="icon-button" aria-label="Close chat" onClick={close}><X size={20} /></button>
        </>}
      </div>
      <div ref={transcript} className="assistant-messages" role="log" aria-live="polite" aria-label="Conversation with Geraki" aria-busy={busy}>
        {messages.map((m, i) => <div key={i} className={`assistant-message ${m.role}`}>
          <span>{m.role === "user" ? "You" : "Geraki"}</span>
          <div className="prose"><ReactMarkdown>{m.content}</ReactMarkdown></div>
        </div>)}
        {busy && <div className="thinking" role="status"><i /><i /><i /> Geraki is thinking…</div>}
      </div>
      {error && <div className="notice error chat-error" role="alert">
        <p>{error}</p>
        <div className="inline-actions">
          <button className="text-link" disabled={busy} onClick={() => void retry()}>Try again</button>
          <Link href="/contact" onClick={close}>Contact the team</Link>
        </div>
      </div>}
      <form className="assistant-compose" onSubmit={(e) => { e.preventDefault(); void ask(); }}>
        <label className="sr-only" htmlFor={inputId}>Your message to Geraki</label>
        <textarea id={inputId} value={input} maxLength={4000} onChange={(e) => setInput(e.target.value)}
          placeholder="I have an idea for…" rows={2}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault(); void ask();
            }
          }} />
        <button className="button" aria-label="Send message" disabled={busy || !input.trim()}><ArrowUpRight size={21} /></button>
      </form>
      <div className="assistant-footnote">AI can make mistakes. Confirm project details with our team. <Link href="/privacy" onClick={close}>Your privacy</Link></div>
    </div>
  );
}

export function GerakiPopup({ close }: { close: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = ref.current;
    dialog?.showModal();
    dialog?.querySelector("textarea")?.focus();
    return () => {
      dialog?.close();
      queueMicrotask(() => { if (opener?.isConnected) opener.focus(); });
    };
  }, []);
  return <dialog ref={ref} className="chat-popup" aria-label="Chat with Geraki"
    onCancel={(e) => { e.preventDefault(); close(); }}
    onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
    <GerakiChat close={close} />
  </dialog>;
}
