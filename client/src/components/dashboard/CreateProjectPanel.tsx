import { SubmissionNotice } from "@/components/SubmissionNotice";
import { useState, type FormEvent } from "react";
import { services } from "@shared/schema";
import { projectsApi } from "@/lib/api";
export function CreateProjectPanel({ owner }: { owner: string }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    setPending(true);
    setMessage("");
    try {
      await projectsApi.create(owner, Object.fromEntries(new FormData(form)));
      form.reset();
      setMessage(
        "Project brief submitted. You can follow its progress under Your projects.",
      );
    } catch {
      setMessage(
        "Your brief couldn’t be saved. Check your details and connection, then try again.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="panel">
      <h2>Start a project</h2>
      <form className="stack" onSubmit={submit}>
        <label>
          Project name
          <input name="projectName" required maxLength={120} />
        </label>
        <label>
          <span id="service-type-label">Service</span>
          <select
            aria-labelledby="service-type-label"
            name="serviceType"
            required
            defaultValue=""
          >
            <option disabled value="">
              Choose a service
            </option>
            {Object.entries(services).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Project brief
          <textarea
            name="description"
            rows={5}
            required
            minLength={10}
            maxLength={4000}
          />
        </label>
        <div className="pair">
          <label>
            Timeline (optional)
            <input name="timeline" maxLength={120} />
          </label>
          <label>
            Budget (optional)
            <input name="budget" maxLength={120} />
          </label>
        </div>
        <button className="button" disabled={pending}>
          {pending ? "Submitting…" : "Submit brief"}
        </button>
        <SubmissionNotice pending={pending} message={message} />
      </form>
    </section>
  );
}
