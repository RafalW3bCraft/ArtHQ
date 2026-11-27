import { useEffect, useState, type FormEvent } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { Generation } from "@/components/business/Generation";
import {
  Plus,
  Save,
  ArrowUpRight,
  LogOut,
  Pencil,
  Trash2,
  Check,
  Eye,
  EyeOff,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { api, send, queryClient } from "@/lib/queryClient";
import { Intro, Modal, Notice, PageTitle } from "@/components/business/Shell";
import {
  defaultSettings,
  services,
  money,
  type Content,
  type ServicePackage,
  type BusinessSettings,
  type ProjectOrder,
} from "@shared/catalog";
type Overview = {
  settings: BusinessSettings;
  content: Content[];
  orders: ProjectOrder[];
  inquiries: any[];
  messages: any[];
  reports: any[];
  readiness: Record<string, boolean>;
  nextCursors?: Record<string, string | null>;
  counts?: { orders: number; inquiries: number; content: number; reports: number };
};
const blankContent = {
  title: "",
  slug: "",
  kind: "article",
  excerpt: "",
  body: "",
  published: false,
  featured: false,
  category: "Insights",
  imageUrl: "",
  liveUrl: "",
  sourceUrl: "",
  order: 0,
};
export default function StudioAdmin() {
  const { user, isAdmin, loading, logout } = useAuth();
  const { data, error, isPending } = useQuery<Overview>({
    queryKey: ["/api/admin/overview", user?.uid],
    queryFn: ({ signal }) => api("/api/admin/overview", { signal, headers: { "X-List-Pagination": "cursor" } }),
    enabled: isAdmin,
  });
  const [tab, setTab] = useState("Overview");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [settings, setSettings] = useState<BusinessSettings>(defaultSettings);
  const [editor, setEditor] = useState<any>(null);
  const [preview, setPreview] = useState(false);
  const [legacyCursor, setLegacyCursor] = useState<string | null>(null);
  const [packageEditor, setPackageEditor] = useState<ServicePackage | null>(
    null,
  );
  const [approval, setApproval] = useState<ProjectOrder | null>(null);
  const [packageOriginalId, setPackageOriginalId] = useState<string | null>(
    null,
  );
  const [reconcile, setReconcile] = useState<{
    order: ProjectOrder;
    stage: string;
  } | null>(null);
  useEffect(() => {
    if (data) setSettings(data.settings);
  }, [data]);
  async function action(
    fn: () => Promise<unknown>,
    success: string | ((result: any) => string) = "Saved.",
    invalidate = true,
  ) {
    setBusy(true);
    setFailed(false);
    setStatus("");
    try {
      const result = await fn();
      setStatus(typeof success === "function" ? success(result) : success);
      if (invalidate) await queryClient.invalidateQueries();
    } catch (e) {
      setFailed(true);
      setStatus((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function saveContent(e: FormEvent) {
    e.preventDefault();
    await action(async () => {
      const { id, createdAt, updatedAt, ...body } = editor;
      await send(
        id ? `/api/admin/content/${id}` : "/api/admin/content",
        body,
        id ? "PUT" : "POST",
      );
      setEditor(null);
    });
  }
  async function loadMore(collection: string) {
    const cursor = data?.nextCursors?.[collection];
    if (!cursor) return;
    await action(async () => {
      const page = await api<{ items: any[]; nextCursor: string | null }>(`/api/admin/collections/${collection}?cursor=${encodeURIComponent(cursor)}`);
      queryClient.setQueryData<Overview>(["/api/admin/overview", user?.uid], previous => previous ? {
        ...previous,
        [collection]: [...(previous[collection as keyof Overview] as any[]), ...page.items].filter((item, index, all) => all.findIndex(other => other.id === item.id) === index),
        nextCursors: { ...previous.nextCursors, [collection]: page.nextCursor },
      } : previous);
    }, "More records loaded.", false);
  }
  async function savePackage(e: FormEvent) {
    e.preventDefault();
    if (!packageEditor) return;
    if (
      packageOriginalId === null &&
      settings.packages.some((p) => p.id === packageEditor.id)
    ) {
      setFailed(true);
      setStatus("That package ID already exists. Choose another.");
      return;
    }
    await action(async () => {
      const packages = settings.packages.filter(
        (p) => p.id !== packageOriginalId,
      );
      await send(
        "/api/admin/settings",
        { ...settings, packages: [...packages, packageEditor] },
        "PUT",
      );
      setPackageEditor(null);
    });
  }
  if (loading)
    return (
      <div className="container section">
        <Notice>Checking your account…</Notice>
      </div>
    );
  if (!user || !isAdmin)
    return (
      <section className="container section">
        <Intro eyebrow="STUDIO ADMIN" title="This space is for the team." />
        <p>
          Sign in with an account that has the Firebase administrator claim.
        </p>
        <Link href="/login?next=/admin" className="button">
          Sign in <ArrowUpRight size={16} />
        </Link>
      </section>
    );
  return (
    <>
      <PageTitle title="Studio admin" />
      <section className="container section admin-page">
        <div className="section-heading">
          <Intro eyebrow="ARTHQ" title="Your studio, at a glance." />
          <button className="text-link" onClick={() => void logout()}>
            <LogOut size={16} />
            Sign out
          </button>
        </div>
        <div
          className="admin-tabs"
          role="navigation"
          aria-label="Admin sections"
        >
          {[
            "Overview",
            "Content",
            "Packages",
            "Generation",
            "Orders",
            "Inbox",
            "Community",
            "Settings",
          ].map((t) => (
            <button
              key={t}
              className={tab === t ? "chip active" : "chip"}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>
        {status && <Notice error={failed}>{status}</Notice>}
        {error && (
          <Notice error>
            {error.message} Server access to Firestore must be configured before
            managing content.
          </Notice>
        )}
        {isPending && <Notice>Loading studio data…</Notice>}
        {data && tab === "Overview" && (
          <>
            <div className="admin-stats">
              {[
                ["Project orders", data.counts?.orders ?? data.orders.length],
                [
                  "New enquiries",
                  data.counts?.inquiries ?? data.inquiries.filter((i) => i.status === "new").length,
                ],
                [
                  "Published pages",
                  data.counts?.content ?? data.content.filter((c) => c.published).length,
                ],
                [
                  "Community reports",
                  data.counts?.reports ?? data.reports.filter((r) => r.status === "open").length,
                ],
              ].map(([label, n]) => (
                <div key={label}>
                  <strong>{n}</strong>
                  <span>{label}</span>
                </div>
              ))}
            </div>
            <div className="admin-panel">
              <h2>Launch checklist</h2>
              <p>
                These checks confirm configuration presence. Live provider
                testing is also required before launch.
              </p>
              <div className="readiness-list">
                {Object.entries(data.readiness).map(([name, ready]) => (
                  <div key={name}>
                    <span
                      className={ready ? "status-dot good" : "status-dot"}
                    />
                    <strong>{name}</strong>
                    <span>{ready ? "Configured" : "Needs setup"}</span>
                  </div>
                ))}
              </div>
              <p className="muted">
                Add real package prices, your business address, and refund terms
                in Settings. Razorpay keys stay in the server environment.
                Geraki can only recommend published packages.
              </p>
            </div>
          </>
        )}
        {data && tab === "Generation" && <Generation edit={(id) => void action(async () => {
          const content = await api<Content>(`/api/admin/content/${id}`);
          setPreview(false); setEditor(content);
        }, "Draft opened for review.", false)} />}
        {data && ["Content", "Orders", "Inbox", "Community"].includes(tab) && (
          <div className="inline-actions">{(tab === "Content" ? ["content"] : tab === "Orders" ? ["orders"] : tab === "Inbox" ? ["inquiries"] : ["messages", "reports"]).map(collection => data.nextCursors?.[collection] ?
            <button className="button outline small" key={collection} disabled={busy} onClick={() => void loadMore(collection)}>Load more {collection}</button> : null)}</div>
        )}
        {data && tab === "Content" && (
          <>
            <div className="admin-toolbar">
              <p>
                Write articles, publish reports, and curate the work clients
                see.
              </p>
              <button
                className="button small"
                onClick={() => setEditor({ ...blankContent })}
              >
                <Plus size={16} />
                New content
              </button>
            </div>
            <div className="inline-actions">
              <button
                className="text-link"
                disabled={busy}
                onClick={() =>
                  void action(
                    () => send("/api/admin/import-projects", {}),
                    "Public GitHub examples imported as drafts.",
                  )
                }
              >
                Import verified project drafts
              </button>
              <button
                className="text-link"
                disabled={busy}
                onClick={() =>
                  void action(
                    async () => {
                      const result = await send("/api/admin/import-legacy", {
                        cursor: legacyCursor || undefined,
                      });
                      setLegacyCursor(result.nextCursor);
                      return result;
                    },
                    (result) =>
                      `${result.imported} articles imported as drafts; ${result.alreadyImported} already imported; ${result.skipped} skipped. Original records preserved.${result.issues.length ? " Review skipped records: " + result.issues.map((issue: { id: string; reason: string; fields?: string[] }) => `${issue.id}: ${issue.reason === "slug_conflict" ? "page address already used" : "invalid " + issue.fields?.join(", ")}`).join("; ") : ""}`,
                  )
                }
              >
                {legacyCursor
                  ? "Continue article import"
                  : "Import existing articles as drafts"}
              </button>
            </div>
            <div className="admin-list">
              {data.content.map((c) => (
                <article key={c.id}>
                  <div>
                    <span className="eyebrow">
                      {c.kind} · {c.published ? "Published" : "Draft"}{" "}
                      {c.featured && "· Featured"}
                    </span>
                    <h3>{c.title}</h3>
                    <p>
                      /{c.kind === "project" ? "projects" : "blog"}/{c.slug}
                    </p>
                  </div>
                  <div className="inline-actions">
                    <button
                      className="icon-button"
                      aria-label={`Edit ${c.title}`}
                      onClick={() => setEditor(c)}
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      className="icon-button"
                      disabled={busy}
                      aria-label={`Delete ${c.title}`}
                      onClick={() => {
                        if (window.confirm(`Permanently delete “${c.title}”?`))
                          void action(() =>
                            api(`/api/admin/content/${c.id}`, {
                              method: "DELETE",
                            }),
                          );
                      }}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
        {data && tab === "Packages" && (
          <>
            <div className="admin-toolbar">
              <p>
                Only published packages are shown to Geraki and clients. Prices
                are in INR; final scope requires your approval.
              </p>
              <button
                className="button small"
                onClick={() => {
                  setPackageOriginalId(null);
                  setPackageEditor({
                    id: "",
                    name: "",
                    serviceId: "websites",
                    description: "",
                    includes: [""],
                    priceINR: 0,
                    published: false,
                  });
                }}
              >
                <Plus size={16} />
                Add package
              </button>
            </div>
            <div className="admin-list">
              {settings.packages.map((p) => (
                <article key={p.id}>
                  <div>
                    <span className="eyebrow">
                      {p.serviceId} · {p.published ? "Published" : "Draft"}
                    </span>
                    <h3>
                      {p.name} · {money(p.priceINR * 100)}
                    </h3>
                    <p>{p.description}</p>
                  </div>
                  <div className="inline-actions">
                    <button
                      className="icon-button"
                      aria-label={`Edit ${p.name}`}
                      onClick={() => {
                        setPackageOriginalId(p.id);
                        setPackageEditor(p);
                      }}
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      className="icon-button"
                      disabled={busy}
                      aria-label={`Remove ${p.name}`}
                      onClick={() => {
                        if (
                          window.confirm(
                            "Remove this package from future bookings? Existing orders are preserved.",
                          )
                        )
                          void action(() =>
                            send(
                              "/api/admin/settings",
                              {
                                ...settings,
                                packages: settings.packages.filter(
                                  (x) => x.id !== p.id,
                                ),
                              },
                              "PUT",
                            ),
                          );
                      }}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
            {!settings.packages.length && (
              <Notice>
                No packages yet. Add your actual offers and prices; we have not
                invented prices for your business.
              </Notice>
            )}
          </>
        )}
        {data && tab === "Orders" && (
          <div className="admin-list">
            {!data.orders.length && <Notice>No project orders yet.</Notice>}
            {data.orders.map((order) => (
              <article className="admin-order" key={order.id}>
                <div>
                  <span className="eyebrow">
                    {order.status} · {order.id.slice(0, 8)}
                  </span>
                  <h3>
                    {order.brief.name} · {order.packageName}
                  </h3>
                  <a href={`mailto:${order.brief.email}`}>
                    {order.brief.email}
                  </a>
                  <p>{order.brief.requirements}</p>
                  <p>
                    <strong>Budget:</strong> {order.brief.budget} ·{" "}
                    <strong>Timeline:</strong> {order.brief.timeline}
                  </p>
                  {order.scope && (
                    <p>
                      <strong>Approved scope:</strong> {order.scope}
                    </p>
                  )}
                  <div className="filter-row">
                    {Object.entries(order.payments).map(([stage, p]) => (
                      <span className="chip" key={stage}>
                        {stage}: {money(p.amount)} · {p.state}
                      </span>
                    ))}
                  </div>
                  <div className="inline-actions">
                    {Object.entries(order.payments)
                      .filter(([, p]) =>
                        ["review", "creating", "pending"].includes(p.state),
                      )
                      .map(([stage]) => (
                        <button
                          key={stage}
                          className="text-link"
                          onClick={() => setReconcile({ order, stage })}
                        >
                          Check {stage} payment
                        </button>
                      ))}
                    {order.status === "review" && (
                      <button
                        className="button small"
                        onClick={() => setApproval(order)}
                      >
                        Approve scope & price
                      </button>
                    )}
                    {order.status === "in_progress" &&
                      !order.payments.progress && (
                        <button
                          className="button small"
                          disabled={busy}
                          onClick={() =>
                            void action(() =>
                              send(
                                `/api/admin/orders/${order.id}`,
                                { action: "release", stage: "progress" },
                                "PUT",
                              ),
                            )
                          }
                        >
                          Phase two complete · request 40%
                        </button>
                      )}
                    {order.payments.progress?.state === "paid" &&
                      !order.payments.delivery && (
                        <button
                          className="button small"
                          disabled={busy}
                          onClick={() =>
                            void action(() =>
                              send(
                                `/api/admin/orders/${order.id}`,
                                { action: "release", stage: "delivery" },
                                "PUT",
                              ),
                            )
                          }
                        >
                          Ready for handover · request 30%
                        </button>
                      )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
        {data && tab === "Inbox" && (
          <div className="admin-list">
            {!data.inquiries.length && <Notice>No enquiries yet.</Notice>}
            {data.inquiries.map((item) => (
              <article key={item.id}>
                <div>
                  <span className="eyebrow">
                    {item.serviceId} · {item.status}
                  </span>
                  <h3>{item.name}</h3>
                  <a href={`mailto:${item.email}`}>{item.email}</a>
                  <p className="preserve-lines">{item.message}</p>
                </div>
                <label>
                  Status
                  <select
                    value={item.status}
                    disabled={busy}
                    onChange={(e) =>
                      void action(() =>
                        send(
                          `/api/admin/inquiries/${item.id}`,
                          { status: e.target.value },
                          "PUT",
                        ),
                      )
                    }
                  >
                    {["new", "contacted", "closed"].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
              </article>
            ))}
          </div>
        )}
        {data && tab === "Community" && (
          <>
            <p>
              Review messages, hide inappropriate content, and retry failed
              Geraki replies. {data.reports.length} report(s) received.
            </p>
            <div className="admin-list">
              {data.messages.map((m) => (
                <article key={m.id}>
                  <div>
                    <span className="eyebrow">
                      {m.context} · {m.status} ·{" "}
                      {data.reports.filter((r) => r.messageId === m.id).length}{" "}
                      reports
                    </span>
                    <h3>{m.authorName}</h3>
                    <p>{m.content}</p>
                  </div>
                  <div className="inline-actions">
                    {data.reports
                      .filter(
                        (r) => r.messageId === m.id && r.status === "open",
                      )
                      .map((r) => (
                        <button
                          key={r.id}
                          className="text-link"
                          disabled={busy}
                          onClick={() =>
                            void action(() =>
                              send(
                                `/api/admin/reports/${r.id}`,
                                { status: "resolved" },
                                "PUT",
                              ),
                            )
                          }
                        >
                          Resolve report
                        </button>
                      ))}
                    <button
                      className="button small outline"
                      disabled={busy}
                      onClick={() =>
                        void action(() =>
                          send(
                            `/api/admin/messages/${m.id}`,
                            {
                              status:
                                m.status === "published"
                                  ? "hidden"
                                  : "published",
                            },
                            "PUT",
                          ),
                        )
                      }
                    >
                      {m.status === "published" ? (
                        <EyeOff size={15} />
                      ) : (
                        <Eye size={15} />
                      )}
                      {m.status === "published" ? "Hide" : "Publish"}
                    </button>
                    {m.askGeraki && (
                      <button
                        className="text-link"
                        disabled={busy}
                        onClick={() =>
                          void action(
                            () => send(`/api/admin/messages/${m.id}/retry`, {}),
                            "Reply job checked.",
                          )
                        }
                      >
                        Retry AI reply
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
        {data && tab === "Settings" && (
          <form
            className="form-stack admin-panel"
            onSubmit={(e) => {
              e.preventDefault();
              void action(() => send("/api/admin/settings", settings, "PUT"));
            }}
          >
            <h2>Business details & policies</h2>
            <label>
              Contact email
              <input
                type="email"
                required
                value={settings.contactEmail}
                onChange={(e) =>
                  setSettings({ ...settings, contactEmail: e.target.value })
                }
              />
            </label>
            <label>
              Business address
              <textarea
                value={settings.businessAddress}
                onChange={(e) =>
                  setSettings({ ...settings, businessAddress: e.target.value })
                }
                maxLength={500}
                placeholder="Your business correspondence address in India"
              />
            </label>
            <label>
              Refund & cancellation policy
              <textarea
                rows={6}
                maxLength={5000}
                value={settings.refundPolicy}
                onChange={(e) =>
                  setSettings({ ...settings, refundPolicy: e.target.value })
                }
                placeholder="State when the booking fee and milestone payments are refundable, how to request cancellation, and expected processing times."
              />
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={settings.bookingCredited}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    bookingCredited: e.target.checked,
                  })
                }
              />
              Credit the ₹500 booking fee against the first 30% milestone
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={settings.termsApproved}
                onChange={(e) =>
                  setSettings({ ...settings, termsApproved: e.target.checked })
                }
              />
              I confirm the business details and payment/refund terms are ready
              to publish
            </label>
            <h2>Community</h2>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={settings.communityEnabled}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    communityEnabled: e.target.checked,
                  })
                }
              />
              Enable community conversations
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={settings.autoReplies}
                onChange={(e) =>
                  setSettings({ ...settings, autoReplies: e.target.checked })
                }
              />
              Allow Geraki to answer questions when members ask for a reply
            </label>
            <h2>Social links</h2>
            <p>
              Check that each profile is yours and active before enabling it.
            </p>
            {settings.socials.map((s, i) => (
              <div className="social-edit" key={i}>
                <input
                  aria-label="Social network name"
                  value={s.label}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      socials: settings.socials.map((x, j) =>
                        j === i ? { ...x, label: e.target.value } : x,
                      ),
                    })
                  }
                />
                <input
                  type="url"
                  aria-label={`${s.label} URL`}
                  value={s.url}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      socials: settings.socials.map((x, j) =>
                        j === i ? { ...x, url: e.target.value } : x,
                      ),
                    })
                  }
                />
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={s.enabled}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        socials: settings.socials.map((x, j) =>
                          j === i ? { ...x, enabled: e.target.checked } : x,
                        ),
                      })
                    }
                  />
                  Show
                </label>
                <button
                  className="icon-button"
                  type="button"
                  aria-label={`Remove ${s.label}`}
                  onClick={() =>
                    setSettings({
                      ...settings,
                      socials: settings.socials.filter((_, j) => j !== i),
                    })
                  }
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {settings.socials.length < 8 && (
              <button
                type="button"
                className="text-link"
                onClick={() =>
                  setSettings({
                    ...settings,
                    socials: [
                      ...settings.socials,
                      { label: "", url: "", enabled: false },
                    ],
                  })
                }
              >
                Add social link
              </button>
            )}
            <button className="button" disabled={busy}>
              <Save size={16} />
              Save settings
            </button>
          </form>
        )}
        {editor && (
          <Modal
            title={editor.id ? "Edit content" : "Create content"}
            close={() => setEditor(null)}
          >
            <button type="button" className="button outline small" onClick={() => setPreview(!preview)}>{preview ? "Hide preview" : "Preview content"}</button>
            {preview && <article className="content-preview prose"><h2>{editor.title}</h2><p>{editor.excerpt}</p><ReactMarkdown>{editor.body}</ReactMarkdown></article>}
            <form className="form-stack" onSubmit={saveContent}>
              <label>
                Content type
                <select
                  value={editor.kind}
                  onChange={(e) =>
                    setEditor({ ...editor, kind: e.target.value })
                  }
                >
                  <option value="article">Article</option>
                  <option value="report">Report</option>
                  <option value="project">Project showcase</option>
                </select>
              </label>
              {(
                [
                  "title",
                  "slug",
                  "category",
                  "excerpt",
                  "imageUrl",
                  "liveUrl",
                  "sourceUrl",
                ] as const
              ).map((field) => (
                <label key={field}>
                  {
                    {
                      title: "Title",
                      slug: "Page address (lowercase-with-hyphens)",
                      category: "Category",
                      excerpt: "Short description",
                      imageUrl: "Image URL (optional, HTTPS)",
                      liveUrl:
                        "Live site URL (optional, verify before publishing)",
                      sourceUrl: "Source/project URL (optional)",
                    }[field]
                  }
                  <input
                    required={["title", "slug", "category", "excerpt"].includes(
                      field,
                    )}
                    value={editor[field]}
                    onChange={(e) =>
                      setEditor({ ...editor, [field]: e.target.value })
                    }
                  />
                </label>
              ))}
              <label>
                Article / report / project story
                <textarea
                  rows={10}
                  required
                  value={editor.body}
                  onChange={(e) =>
                    setEditor({ ...editor, body: e.target.value })
                  }
                  placeholder="Write in plain language. Markdown formatting is supported."
                />
              </label>
              <label>
                Display order
                <input
                  type="number"
                  min={0}
                  max={999}
                  value={editor.order}
                  onChange={(e) =>
                    setEditor({ ...editor, order: Number(e.target.value) })
                  }
                />
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={editor.featured}
                  onChange={(e) =>
                    setEditor({ ...editor, featured: e.target.checked })
                  }
                />
                Feature on homepage
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={editor.published}
                  onChange={(e) =>
                    setEditor({ ...editor, published: e.target.checked })
                  }
                />
                Publish on website
              </label>
              <button className="button" disabled={busy}>
                <Save size={16} />
                Save content
              </button>
              {failed && status && <Notice error>{status}</Notice>}
            </form>
          </Modal>
        )}
        {packageEditor && (
          <Modal title="Package details" close={() => setPackageEditor(null)}>
            <form className="form-stack" onSubmit={savePackage}>
              <label>
                Package ID
                <input
                  required
                  pattern="[a-z0-9-]+"
                  value={packageEditor.id}
                  disabled={packageOriginalId !== null}
                  onChange={(e) =>
                    setPackageEditor({ ...packageEditor, id: e.target.value })
                  }
                />
              </label>
              <label>
                Name
                <input
                  required
                  value={packageEditor.name}
                  onChange={(e) =>
                    setPackageEditor({ ...packageEditor, name: e.target.value })
                  }
                />
              </label>
              <label>
                Service
                <select
                  value={packageEditor.serviceId}
                  onChange={(e) =>
                    setPackageEditor({
                      ...packageEditor,
                      serviceId: e.target.value as ServicePackage["serviceId"],
                    })
                  }
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Description
                <textarea
                  required
                  value={packageEditor.description}
                  onChange={(e) =>
                    setPackageEditor({
                      ...packageEditor,
                      description: e.target.value,
                    })
                  }
                />
              </label>
              <label>
                What is included (one item per line)
                <textarea
                  required
                  rows={5}
                  value={packageEditor.includes.join("\n")}
                  onChange={(e) =>
                    setPackageEditor({
                      ...packageEditor,
                      includes: e.target.value.split("\n"),
                    })
                  }
                />
              </label>
              <label>
                Starting price in INR
                <input
                  type="number"
                  required
                  min={500}
                  step={1}
                  value={packageEditor.priceINR}
                  onChange={(e) =>
                    setPackageEditor({
                      ...packageEditor,
                      priceINR: Number(e.target.value),
                    })
                  }
                />
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={packageEditor.published}
                  onChange={(e) =>
                    setPackageEditor({
                      ...packageEditor,
                      published: e.target.checked,
                    })
                  }
                />
                Publish for Geraki and customers
              </label>
              <button className="button" disabled={busy}>
                <Save size={16} />
                Save package
              </button>
              {failed && status && <Notice error>{status}</Notice>}
            </form>
          </Modal>
        )}
        {reconcile && (
          <Modal
            title="Check payment with Razorpay"
            close={() => setReconcile(null)}
          >
            <form
              className="form-stack"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                void action(async () => {
                  await send(
                    `/api/admin/orders/${reconcile.order.id}/reconcile`,
                    {
                      stage: reconcile.stage,
                      providerOrderId: f.get("providerOrderId"),
                    },
                  );
                  setReconcile(null);
                }, "Payment checked against Razorpay.");
              }}
            >
              <p>
                Find the matching order in your Razorpay dashboard using project
                ID {reconcile.order.id} and milestone {reconcile.stage}. The
                server checks its amount and project reference before linking
                it. No new charge is created.
              </p>
              <label>
                Razorpay order ID
                <input
                  name="providerOrderId"
                  pattern="order_[a-zA-Z0-9]+"
                  defaultValue={
                    reconcile.order.payments[
                      reconcile.stage as keyof typeof reconcile.order.payments
                    ]?.providerOrderId || ""
                  }
                  required
                />
              </label>
              <button className="button" disabled={busy}>
                Check payment
              </button>
              {failed && status && <Notice error>{status}</Notice>}
            </form>
          </Modal>
        )}
        {approval && (
          <Modal title="Approve scope & price" close={() => setApproval(null)}>
            <form
              className="form-stack"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                void action(async () => {
                  await send(
                    `/api/admin/orders/${approval.id}`,
                    {
                      action: "approve",
                      totalINR: Number(f.get("total")),
                      scope: f.get("scope"),
                    },
                    "PUT",
                  );
                  setApproval(null);
                });
              }}
            >
              <p>
                Confirm the exact scope with the client. The client will review
                this before paying the first milestone.
              </p>
              <label>
                Total project price in INR
                <input
                  name="total"
                  type="number"
                  min={1700}
                  step={0.01}
                  required
                />
              </label>
              <label>
                Agreed deliverables, timeline, and revisions
                <textarea
                  name="scope"
                  minLength={10}
                  maxLength={10000}
                  rows={6}
                  required
                />
              </label>
              <button className="button" disabled={busy}>
                <Check size={17} />
                Approve & request first 30%
              </button>
              {failed && status && <Notice error>{status}</Notice>}
            </form>
          </Modal>
        )}
      </section>
    </>
  );
}
