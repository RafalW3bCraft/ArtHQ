import { useState } from "react";
import {
  statusLabel,
  services,
  type Project,
  type SupportMessage,
  type ContactSubmission,
  type UserProfile,
} from "@shared/schema";
import { contactApi, projectsApi, supportApi } from "@/lib/api";
import { Records, Submitted, useRecords } from "@/components/dashboard/Records";

function replyHref(email: string, subject: string, name: string) {
  return `mailto:${email}?subject=${encodeURIComponent(`Re: ${subject}`)}&body=${encodeURIComponent(`Hi ${name},\n\nThank you for contacting ArtHQ.\n\n`)}`;
}

function StatusAction({
  label,
  save,
}: {
  label: string;
  save: () => Promise<void>;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function act() {
    setPending(true);
    setError("");
    try {
      await save();
    } catch {
      setError("The change couldn’t be saved. Refresh and try again.");
    } finally {
      setPending(false);
    }
  }
  return (
    <span>
      <button className="outline-button small" disabled={pending} onClick={act}>
        {pending ? "Saving…" : label}
      </button>
      {error && <span role="alert">{error}</span>}
    </span>
  );
}
export default function AdminPage() {
  const [tab, setTab] = useState("Projects");
  const projects = useRecords<Project>("projects");
  const support = useRecords<SupportMessage>("support_messages");
  const contacts = useRecords<ContactSubmission>("contact_submissions");
  const users = useRecords<UserProfile>("users");
  const profiles = new Map(users.items.map((user) => [user.uid, user]));
  function client(uid: string) {
    const user = profiles.get(uid);
    return user ? (
      <p className="muted">
        {user.companyName} · <a href={"mailto:" + user.email}>{user.email}</a> ·{" "}
        {user.phoneNumber}
      </p>
    ) : (
      <p className="muted">Client ID {uid}</p>
    );
  }
  return (
    <>
      <h1>Admin workspace</h1>
      <div className="tab-bar">
        {["Projects", "Support", "Enquiries"].map((name) => (
          <button
            key={name}
            aria-pressed={tab === name}
            onClick={() => setTab(name)}
          >
            {name}
          </button>
        ))}
      </div>
      {users.state === "error" && (
        <p role="alert">Client contact details couldn’t be loaded.</p>
      )}
      <section className="panel">
        <h2>{tab}</h2>
        {tab === "Projects" && (
          <Records result={projects} empty="No projects have been submitted.">
            {(p) => (
              <>
                <div className="record-title">
                  <h3>{p.projectName}</h3>
                  <span className="badge">{statusLabel(p.status)}</span>
                </div>
                {client(p.userId)}
                <p>{p.description}</p>
                <p>
                  {[
                    services[p.serviceType],
                    p.timeline && "Timeline: " + p.timeline,
                    p.budget && "Budget: " + p.budget,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <Submitted at={p.createdAt} />
                <div className="inline">
                  {p.status === "pending" && (
                    <StatusAction
                      label="Start project"
                      save={() => projectsApi.updateStatus(p.id, "in-progress")}
                    />
                  )}
                  {p.status === "in-progress" && (
                    <StatusAction
                      label="Complete project"
                      save={() => projectsApi.updateStatus(p.id, "completed")}
                    />
                  )}
                  {["pending", "in-progress"].includes(p.status) && (
                    <StatusAction
                      label="Cancel project"
                      save={() => projectsApi.updateStatus(p.id, "cancelled")}
                    />
                  )}
                </div>
              </>
            )}
          </Records>
        )}
        {tab === "Support" && (
          <Records
            result={support}
            empty="No support tickets have been submitted."
          >
            {(t) => (
              <>
                <div className="record-title">
                  <h3>{t.subject}</h3>
                  <span className="badge">{statusLabel(t.status)}</span>
                </div>
                {client(t.userId)}
                <p>{t.message}</p>
                <Submitted at={t.createdAt} />
                {profiles.get(t.userId) && (
                  <p>
                    <a
                      className="outline-button small"
                      href={replyHref(
                        profiles.get(t.userId)!.email,
                        t.subject,
                        profiles.get(t.userId)!.companyName,
                      )}
                      aria-label={`Reply to ${profiles.get(t.userId)!.companyName} by email`}
                    >
                      Reply by email
                    </a>
                  </p>
                )}
                {t.status !== "resolved" && (
                  <div>
                    <StatusAction
                      label={
                        t.status === "open" ? "Start ticket" : "Resolve ticket"
                      }
                      save={() =>
                        supportApi.updateStatus(
                          t.id,
                          t.status === "open" ? "in-progress" : "resolved",
                        )
                      }
                    />
                  </div>
                )}
              </>
            )}
          </Records>
        )}
        {tab === "Enquiries" && (
          <Records
            result={contacts}
            empty="No contact enquiries have been submitted."
          >
            {(c) => (
              <>
                <div className="record-title">
                  <h3>{c.name}</h3>
                  <span className="badge">{statusLabel(c.status)}</span>
                </div>
                <a href={"mailto:" + c.email}>{c.email}</a>
                <p>{c.message}</p>
                <Submitted at={c.createdAt} />
                <p>
                  <a
                    className="outline-button small"
                    href={replyHref(c.email, "Your ArtHQ enquiry", c.name)}
                    aria-label={`Reply to ${c.name} by email`}
                  >
                    Reply by email
                  </a>
                </p>
                {c.status !== "responded" && (
                  <div>
                    <StatusAction
                      label={
                        c.status === "new"
                          ? "Mark as read"
                          : "Mark as responded"
                      }
                      save={() =>
                        contactApi.updateStatus(
                          c.id,
                          c.status === "new" ? "read" : "responded",
                        )
                      }
                    />
                  </div>
                )}
              </>
            )}
          </Records>
        )}
      </section>
    </>
  );
}
