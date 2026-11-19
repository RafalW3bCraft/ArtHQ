import { SubmissionNotice } from "@/components/SubmissionNotice";
import { useState, type FormEvent } from "react";
import { statusLabel, type SupportMessage } from "@shared/schema";
import { supportApi } from "@/lib/api";
import { Records, Submitted, useRecords } from "./Records";
export function SupportPanel({ owner }: { owner: string }) {
  const tickets = useRecords<SupportMessage>("support_messages", owner);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    setPending(true);
    setMessage("");
    try {
      await supportApi.create(owner, Object.fromEntries(new FormData(form)));
      form.reset();
      setMessage("Your support ticket has been submitted.");
    } catch {
      setMessage(
        "Your ticket couldn’t be saved. Check your details and connection, then try again.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="portal-grid">
      <section className="panel">
        <h2>Request support</h2>
        <p>
          Need help outside the portal? Email{" "}
          <a href="mailto:support@arthq.tech">support@arthq.tech</a> or{" "}
          <a href="mailto:info@rafalwebcraft.online">
            info@rafalwebcraft.online
          </a>.
        </p>
        <form onSubmit={submit} className="stack">
          <label>
            Subject
            <input name="subject" required maxLength={120} />
          </label>
          <label>
            Message
            <textarea
              name="message"
              rows={5}
              required
              minLength={10}
              maxLength={4000}
            />
          </label>
          <button className="button" disabled={pending}>
            {pending ? "Sending…" : "Submit ticket"}
          </button>
          <SubmissionNotice pending={pending} message={message} />
        </form>
      </section>
      <section className="panel">
        <h2>Your tickets</h2>
        <Records
          result={tickets}
          empty="You haven’t submitted a support ticket yet."
        >
          {(ticket) => (
            <>
              <div className="record-title">
                <h3>{ticket.subject}</h3>
                <span className="badge">{statusLabel(ticket.status)}</span>
              </div>
              <p>{ticket.message}</p>
              <Submitted at={ticket.createdAt} />
            </>
          )}
        </Records>
      </section>
    </div>
  );
}
