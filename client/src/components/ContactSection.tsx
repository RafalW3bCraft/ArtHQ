import { SubmissionNotice } from "@/components/SubmissionNotice";
import { useState, type FormEvent } from "react";
import { backendConfigured } from "@/lib/config";

export function ContactSection() {
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !backendConfigured) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setPending(true);
    setFeedback("");
    try {
      const { contactApi } = await import("@/lib/api");
      await contactApi.submit({
        name: String(data.get("name")),
        email: String(data.get("email")),
        message: String(data.get("message")),
      });
      form.reset();
      setFeedback("Your enquiry has been sent to ArtHQ.");
    } catch {
      setFeedback(
        "We couldn’t send your enquiry. Check your connection and try again.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <section id="contact" className="wrap contact-section">
      <div>
        <span className="kicker">
          <span className="rule" /> Contact
        </span>
        <h2>
          Get in
          <br />
          <em>
            touch<span>.</span>
          </em>
        </h2>
        <p>
          Have a brief ready?{" "}
          <a className="text-link" href="/auth?mode=new">
            Start a project
          </a>{" "}
          to track it in your client portal.
        </p>
        <p>
          Prefer email? Contact{" "}
          <a className="text-link" href="mailto:info@rafalwebcraft.online">
            info@rafalwebcraft.online
          </a>{" "}
          or{" "}
          <a className="text-link" href="mailto:support@arthq.tech">
            support@arthq.tech
          </a>.
        </p>
      </div>
      <form onSubmit={submit} className="stack">
        <div className="pair">
          <label>
            Name
            <input
              required
              name="name"
              autoComplete="name"
              minLength={2}
              maxLength={120}
            />
          </label>
          <label>
            Email
            <input
              required
              name="email"
              type="email"
              autoComplete="email"
              maxLength={254}
            />
          </label>
        </div>
        <label>
          Enquiry
          <textarea
            required
            name="message"
            minLength={10}
            maxLength={4000}
            rows={4}
          />
        </label>
        {!backendConfigured && (
          <p className="notice" role="status">
            The enquiry form is currently unavailable. Email{" "}
            <a href="mailto:info@rafalwebcraft.online">
              info@rafalwebcraft.online
            </a>{" "}
            or <a href="mailto:support@arthq.tech">support@arthq.tech</a>.
          </p>
        )}
        <button className="button" disabled={pending || !backendConfigured}>
          {pending ? "Sending…" : "Send enquiry"}
        </button>
        <SubmissionNotice pending={pending} message={feedback} />
      </form>
    </section>
  );
}
