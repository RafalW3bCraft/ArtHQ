import { useState, type FormEvent } from "react";
import { api, send, queryClient } from "@/lib/queryClient";
import { usePaged } from "@/hooks/usePaged";
import { Notice } from "./Shell";
import type {
  Feed,
  Topic,
  NewsCandidate,
  GenerationJob,
} from "@shared/generation";
const root = "/api/admin/generation";
export function Generation({ edit }: { edit: (id: string) => void }) {
  const topics = usePaged<Topic>(`${root}/topics`);
  const feeds = usePaged<Feed>(`${root}/feeds`);
  const candidates = usePaged<NewsCandidate>(`${root}/candidates`);
  const jobs = usePaged<GenerationJob>(`${root}/jobs`, true, true);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [failed, setFailed] = useState(false);
  const [feedEditor, setFeedEditor] = useState<Feed | null>(null);
  async function action(fn: () => Promise<unknown>, message: string) {
    if (busy) return;
    setBusy(true);
    setStatus("");
    setFailed(false);
    try {
      await fn();
      setStatus(message);
    } catch (e) {
      setFailed(true);
      setStatus(e instanceof Error ? e.message : "Request failed.");
    } finally {
      await queryClient.invalidateQueries({
        predicate: (q) => String(q.queryKey[0]).startsWith(root),
      });
      setBusy(false);
    }
  }
  function topicSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    void action(async () => {
      await send(`${root}/topics`, {
        title: f.get("title"),
        brief: f.get("brief"),
        reference: f.get("reference"),
        sourceUrl: f.get("sourceUrl"),
      });
      form.reset();
    }, "Topic saved. Select Generate draft when ready.");
  }
  function feedSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    void action(async () => {
      await send(
        `${root}/feeds${feedEditor ? `/${feedEditor.id}` : ""}`,
        {
          name: f.get("name"),
          url: f.get("url"),
          enabled: f.get("enabled") === "on",
        },
        feedEditor ? "PUT" : "POST",
      );
      setFeedEditor(null);
      form.reset();
    }, "Feed saved. Poll it to find news candidates.");
  }
  const loadMore = (
    query: {
      hasNextPage: boolean;
      isFetching: boolean;
      fetchNextPage: () => unknown;
    },
    label: string,
  ) =>
    query.hasNextPage ? (
      <button
        className="button outline small"
        disabled={query.isFetching}
        onClick={() => void query.fetchNextPage()}
      >
        Load more {label}
      </button>
    ) : null;
  return (
    <div className="form-stack generation-admin">
      <div>
        <h2>Article generation</h2>
        <p>
          Generate practical English drafts for business owners. Review sources
          and every claim before publishing in Content.
        </p>
      </div>
      {status && <Notice error={failed}>{status}</Notice>}
      {[topics, feeds, candidates, jobs].map((q, i) =>
        q.error ? (
          <Notice key={i} error>
            {q.error.message}
          </Notice>
        ) : null,
      )}
      <section className="admin-panel">
        <h3>New topic</h3>
        <form className="form-stack" onSubmit={topicSubmit}>
          <label>
            Topic title
            <input name="title" required maxLength={160} />
          </label>
          <label>
            Editorial brief
            <textarea name="brief" required maxLength={6000} rows={3} />
          </label>
          <label>
            Reference material (optional)
            <textarea name="reference" maxLength={12000} rows={3} />
          </label>
          <label>
            Source URL (optional, HTTPS)
            <input name="sourceUrl" type="url" maxLength={2000} />
          </label>
          <button className="button" disabled={busy}>
            Save topic
          </button>
        </form>
      </section>
      <section className="admin-panel">
        <h3>Topics</h3>
        {topics.isPending ? (
          <p>Loading topics…</p>
        ) : !topics.items.length ? (
          <p>No topics yet.</p>
        ) : (
          topics.items.map((topic) => (
            <div className="generation-row" key={topic.id}>
              <div>
                <strong>{topic.title}</strong>
                <p>{topic.brief}</p>
              </div>
              <button
                className="button small"
                disabled={busy}
                onClick={() =>
                  void action(
                    () =>
                      send(`${root}/jobs`, {
                        sourceKind: "topic",
                        sourceIds: [topic.id],
                      }),
                    "Draft queued. Follow its progress in Jobs.",
                  )
                }
              >
                Generate draft
              </button>
            </div>
          ))
        )}
        {loadMore(topics, "topics")}
      </section>
      <section className="admin-panel">
        <h3>{feedEditor ? "Edit feed" : "Add approved news feed"}</h3>
        <form
          key={feedEditor?.id || "new"}
          className="form-stack"
          onSubmit={feedSubmit}
        >
          <label>
            Feed name
            <input
              name="name"
              required
              maxLength={100}
              defaultValue={feedEditor?.name}
            />
          </label>
          <label>
            RSS or Atom URL
            <input
              name="url"
              type="url"
              required
              maxLength={2000}
              defaultValue={feedEditor?.url}
            />
          </label>
          <label className="checkbox-label">
            <input
              name="enabled"
              type="checkbox"
              defaultChecked={feedEditor?.enabled ?? true}
            />
            Enable manual polling
          </label>
          <div className="inline-actions">
            <button className="button" disabled={busy}>
              Save feed
            </button>
            {feedEditor && (
              <button
                type="button"
                className="button outline"
                onClick={() => setFeedEditor(null)}
              >
                Cancel edit
              </button>
            )}
          </div>
        </form>
        <p>
          Polling imports up to 20 newest entries per feed. It runs only when
          you select Poll now.
        </p>
        {feeds.items.map((feed) => (
          <div key={feed.id} className="generation-row">
            <div>
              <strong>{feed.name}</strong>
              <p>{feed.url}</p>
              <span>{feed.enabled ? "Enabled" : "Paused"}</span>
            </div>
            <div className="inline-actions">
              <button
                className="button outline small"
                disabled={busy}
                onClick={() => setFeedEditor(feed)}
              >
                Edit feed
              </button>
              <button
                className="button small"
                disabled={busy || !feed.enabled}
                onClick={() =>
                  void action(
                    () => send(`${root}/feeds/${feed.id}/poll`, {}),
                    "Feed checked. New items appear in News candidates.",
                  )
                }
              >
                Poll now
              </button>
            </div>
          </div>
        ))}
        {loadMore(feeds, "feeds")}
      </section>
      <section className="admin-panel">
        <h3>News candidates</h3>
        <p>Select up to three items for sourced draft generation.</p>
        {!candidates.items.length && (
          <p>No news candidates yet. Add and poll a feed first.</p>
        )}
        {candidates.items.map((item) => (
          <div key={item.id} className="generation-row">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={selected.includes(item.id)}
                disabled={
                  busy || (!selected.includes(item.id) && selected.length >= 3)
                }
                onChange={(e) =>
                  setSelected(
                    e.target.checked
                      ? [...selected, item.id]
                      : selected.filter((id) => id !== item.id),
                  )
                }
              />
              {item.title}
            </label>
            <a href={item.sourceUrl} target="_blank" rel="noreferrer">
              Original source
              {item.sourceDate ? ` · ${item.sourceDate.slice(0, 10)}` : ""}
            </a>
            <p>{item.summary}</p>
          </div>
        ))}
        <button
          className="button"
          disabled={busy || !selected.length}
          onClick={() =>
            void action(async () => {
              await send(`${root}/jobs`, {
                sourceKind: "news",
                sourceIds: selected,
              });
              setSelected([]);
            }, "News drafts queued for review.")
          }
        >
          Generate selected drafts
        </button>
        {loadMore(candidates, "candidates")}
      </section>
      <section className="admin-panel">
        <h3>Jobs</h3>
        {!jobs.items.length && <p>No generation jobs yet.</p>}
        {jobs.items.map((job) => (
          <div className="generation-row" key={job.id}>
            <div>
              <strong>
                {job.sourceKind === "topic"
                  ? topics.items.find((t) => t.id === job.sourceId)?.title
                  : candidates.items.find((t) => t.id === job.sourceId)
                      ?.title || "News draft"}
              </strong>
              <p role="status">
                {job.state} · {job.attempts} attempt(s)
              </p>
              {job.error && <p>{job.error}</p>}
            </div>
            <div className="inline-actions">
              {job.contentId && (
                <button
                  className="button small"
                  disabled={busy}
                  onClick={() => edit(job.contentId!)}
                >
                  Review draft
                </button>
              )}
              {(job.state === "failed" ||
                ((job.state === "queued" || job.state === "running") &&
                  Date.now() - Date.parse(job.updatedAt) > 180000)) && (
                <button
                  className="button outline small"
                  disabled={busy}
                  onClick={() =>
                    void action(
                      () => send(`${root}/jobs/${job.id}/retry`, {}),
                      "Job queued again.",
                    )
                  }
                >
                  Retry job
                </button>
              )}
            </div>
          </div>
        ))}
        {loadMore(jobs, "jobs")}
      </section>
    </div>
  );
}
