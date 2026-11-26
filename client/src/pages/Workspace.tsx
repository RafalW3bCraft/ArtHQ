import { useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  ArrowRight,
  Send,
  Sparkles,
  Check,
  MessageSquare,
  Flag,
  LogOut,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { api, send, queryClient } from "@/lib/queryClient";
import { Intro, Notice, PageTitle, useSite } from "@/components/business/Shell";
import {
  money,
  services,
  type ProjectOrder,
  type PaymentStage,
} from "@shared/business";
import { useGeraki } from "@/hooks/useGeraki";
import { GerakiChat } from "@/components/business/GerakiChat";
export function Start() {
  const { data: site } = useSite();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { busy, ask } = useGeraki();
  const [error, setError] = useState("");
  const [booking, setBooking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serviceId, setServiceId] = useState(
    () =>
      new URLSearchParams(window.location.search).get("service") || "websites",
  );
  async function submitBrief(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setSaving(true);
    setError("");
    try {
      await send("/api/orders", {
        name: f.get("name"),
        email: user?.email,
        serviceId,
        requirements: f.get("requirements"),
        budget: f.get("budget"),
        timeline: f.get("timeline"),
        packageId: f.get("packageId"),
        consent: f.get("consent") === "on",
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      navigate("/orders");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <PageTitle title="Talk to Geraki" />
      <section className="container section">
        <Intro
          eyebrow="YOUR IDEA STARTS HERE"
          title="Let’s figure it out together."
        >
          <p>
            Discuss your requirements, explore a budget, and find the right next
            step. No payment needed to talk.
          </p>
        </Intro>
        <div className="assistant-layout">
          <GerakiChat />
          <aside className="assistant-sidebar">
            <span className="eyebrow">A GOOD STARTING POINT</span>
            <h2>
              What would you
              <br />
              like to make?
            </h2>
            <div className="prompt-list">
              {[
                "A website for my business",
                "An app for my customers",
                "A bot to automate my work",
                "Help using AI in my business",
              ].map((p) => (
                <button disabled={busy} key={p} onClick={() => void ask(p)}>
                  {p}
                  <ArrowUpRight size={16} />
                </button>
              ))}
            </div>
            <div className="sidebar-note">
              <Check size={18} />
              <p>
                Speak in everyday language. You don’t need to know how it will
                be built.
              </p>
            </div>
            <div className="sidebar-note">
              <MessageSquare size={18} />
              <p>
                Need a person?{" "}
                <Link href="/contact">Leave a message for the team.</Link>
              </p>
            </div>
            <hr />
            <h3>Ready for the next step?</h3>
            <p>
              When you’ve discussed your requirements, review a package and
              prepare your booking brief.
            </p>
            <button
              className="button outline"
              onClick={() => setBooking(!booking)}
            >
              {booking ? "Close brief" : "Prepare my brief"}{" "}
              <ArrowRight size={17} />
            </button>
          </aside>
        </div>
        {booking && (
          <section className="booking-panel">
            <h2>Make sure we’ve got it right.</h2>
            <p>
              Confirm the details yourself before booking. Geraki’s suggestions
              are a starting point; our team approves the final scope.
            </p>
            {!user ? (
              <Notice>
                <Link href="/login?next=/start">
                  Sign in or create an account
                </Link>{" "}
                to save your brief and manage payments. Your conversation stays
                in this tab.
              </Notice>
            ) : !site?.packages.length ? (
              <Notice>
                Packages are being prepared.{" "}
                <Link href="/contact">Send your requirements to the team</Link>{" "}
                for a custom discussion.
              </Notice>
            ) : (
              <form className="form-stack" onSubmit={submitBrief}>
                <div className="form-columns">
                  <label>
                    Your name
                    <input
                      name="name"
                      defaultValue={user.displayName || ""}
                      required
                      maxLength={100}
                    />
                  </label>
                  <label>
                    Email
                    <input value={user.email || ""} disabled />
                  </label>
                </div>
                <label>
                  Service
                  <select
                    value={serviceId}
                    onChange={(e) => setServiceId(e.target.value)}
                  >
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Package discussed with Geraki
                  <select name="packageId" required defaultValue="">
                    <option value="" disabled>
                      Choose a package
                    </option>
                    {site.packages
                      .filter((p) => p.serviceId === serviceId)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} · from {money(p.priceINR * 100)}
                        </option>
                      ))}
                  </select>
                </label>
                {site.packages
                  .filter((p) => p.serviceId === serviceId)
                  .map((p) => (
                    <div className="package-summary" key={p.id}>
                      <strong>{p.name}</strong>
                      <p>{p.description}</p>
                      <ul>
                        {p.includes.map((v) => (
                          <li key={v}>{v}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                <label>
                  Your requirements
                  <textarea
                    name="requirements"
                    required
                    rows={5}
                    maxLength={5000}
                    placeholder="Your goal, audience, must-have features, and anything we should know."
                  />
                </label>
                <div className="form-columns">
                  <label>
                    Budget
                    <input
                      name="budget"
                      required
                      maxLength={100}
                      placeholder="For example, ₹20,000–₹40,000"
                    />
                  </label>
                  <label>
                    Preferred timeline
                    <input
                      name="timeline"
                      required
                      maxLength={100}
                      placeholder="For example, within 6 weeks"
                    />
                  </label>
                </div>
                <div className="notice">
                  Booking: ₹500.{" "}
                  {site.bookingCredited
                    ? "Credited against the first 30% milestone."
                    : "Separate from the project price."}{" "}
                  Final price and scope require team approval. Then: 30% / 40% /
                  30%.
                </div>
                <p className="preserve-lines">{site.refundPolicy}</p>
                <label className="checkbox-label">
                  <input type="checkbox" name="consent" required />I confirm
                  this brief and accept the <Link href="/terms">terms</Link> and{" "}
                  <Link href="/refunds">refund policy</Link>.
                </label>
                <button
                  className="button"
                  disabled={saving || !site.checkoutAvailable}
                >
                  {saving ? "Saving…" : "Save brief & continue to booking"}
                  <ArrowRight size={17} />
                </button>
                {!site.checkoutAvailable && (
                  <Notice>
                    Online booking is not open yet.{" "}
                    <Link href="/contact">Contact the team</Link> to continue.
                  </Notice>
                )}
              </form>
            )}
          </section>
        )}
      </section>
    </>
  );
}
let checkoutScript: Promise<void> | undefined;
function loadCheckout() {
  if ((window as any).Razorpay) return Promise.resolve();
  if (!checkoutScript)
    checkoutScript = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve();
      script.onerror = () => {
        checkoutScript = undefined;
        script.remove();
        reject(new Error("Checkout could not load. Please try again."));
      };
      document.head.appendChild(script);
    });
  return checkoutScript;
}
export function Orders() {
  const { user, loading, logout } = useAuth();
  const {
    data: orders = [],
    error,
    isPending,
  } = useQuery<ProjectOrder[]>({
    queryKey: ["/api/orders", user?.uid],
    enabled: !!user,
    refetchInterval: 15000,
  });
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");
  async function pay(order: ProjectOrder, stage: PaymentStage) {
    setBusy(`${order.id}-${stage}`);
    setNotice("");
    try {
      await loadCheckout();
      const payment = await send(
        "/api/orders/" + order.id + "/pay/" + stage,
        {},
      );
      const checkout = new (window as any).Razorpay({
        key: payment.key,
        amount: payment.amount,
        currency: payment.currency,
        order_id: payment.orderId,
        name: "ArtHQ",
        description: `${stage === "booking" ? "Project booking" : stage + " milestone"} · ${order.packageName}`,
        prefill: { name: order.brief.name, email: user?.email },
        theme: { color: "#5846c8" },
        modal: { ondismiss: () => setBusy("") },
        handler: async (result: unknown) => {
          try {
            const updated = await send<ProjectOrder>(
              `/api/orders/${order.id}/verify-payment`,
              result,
            );
            setNotice(
              updated.payments[stage]?.state === "paid"
                ? "Payment confirmed. Thank you."
                : "Your payment is being confirmed. Please do not pay again.",
            );
            await queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
          } catch (e) {
            setNotice(
              (e as Error).message +
                " If money was deducted, contact us before paying again.",
            );
          } finally {
            setBusy("");
          }
        },
      });
      checkout.on("payment.failed", () => {
        setNotice(
          "The payment was not completed. Check its status before trying again.",
        );
        setBusy("");
      });
      checkout.open();
    } catch (e) {
      setNotice((e as Error).message);
      setBusy("");
    }
  }
  if (loading)
    return (
      <div className="container section">
        <Notice>Loading your account…</Notice>
      </div>
    );
  if (!user)
    return (
      <div className="container section">
        <Intro
          eyebrow="YOUR PROJECT SPACE"
          title="Pick up where you left off."
        />
        <Link href="/login?next=/orders" className="button">
          Sign in <ArrowRight size={17} />
        </Link>
      </div>
    );
  return (
    <>
      <PageTitle title="My projects" />
      <section className="container section">
        <div className="section-heading">
          <Intro
            eyebrow="YOUR PROJECT SPACE"
            title="Good things in progress."
          />
          <button className="text-link" onClick={() => void logout()}>
            <LogOut size={16} /> Sign out
          </button>
        </div>
        {notice && <Notice>{notice}</Notice>}
        {error && <Notice error>{error.message}</Notice>}
        {isPending && <Notice>Loading your projects…</Notice>}
        {!isPending && !orders.length && (
          <div className="empty-state">
            <Sparkles />
            <h2>Your next project starts here.</h2>
            <p>Discuss an idea with Geraki and prepare your brief.</p>
            <Link href="/start" className="button">
              Start a conversation <ArrowRight size={17} />
            </Link>
          </div>
        )}
        <div className="order-list">
          {orders.map((order) => (
            <article className="order-card" key={order.id}>
              <div className="section-heading">
                <div>
                  <span className="eyebrow">
                    {order.status.replaceAll("_", " ")} · {order.id.slice(0, 8)}
                  </span>
                  <h2>{order.packageName}</h2>
                </div>
                {order.quotePaise && (
                  <strong>
                    {money(order.quotePaise)}
                    <small>Agreed project price</small>
                  </strong>
                )}
              </div>
              <p>{order.brief.requirements}</p>
              {order.scope && (
                <div className="scope-box">
                  <h3>Scope approved by the team</h3>
                  <p className="preserve-lines">{order.scope}</p>
                </div>
              )}
              <div className="payment-grid">
                {(["booking", "approval", "progress", "delivery"] as const).map(
                  (stage, i) => {
                    const p = order.payments[stage];
                    return (
                      <div className="payment-card" key={stage}>
                        <span className="eyebrow">
                          0{i + 1} /{" "}
                          {
                            [
                              "Booking",
                              "Approval · 30%",
                              "Phase two · 40%",
                              "Handover · 30%",
                            ][i]
                          }
                        </span>
                        <h3>{p ? money(p.amount) : "Not due yet"}</h3>
                        <p>
                          {p?.state === "paid"
                            ? "Payment confirmed"
                            : p?.state === "review" || p?.state === "creating"
                              ? "Under review. Please contact the team."
                              : p?.state === "refunded"
                                ? "Refunded"
                                : p
                                  ? "Ready when you are"
                                  : "The team will confirm this milestone."}
                        </p>
                        {p?.refundedAmount ? (
                          <p>Refunded: {money(p.refundedAmount)}</p>
                        ) : null}
                        {order.status !== "cancelled" &&
                          p &&
                          ["ready", "pending"].includes(p.state) && (
                            <button
                              className="button small"
                              disabled={!!busy}
                              onClick={() => void pay(order, stage)}
                            >
                              {busy === `${order.id}-${stage}`
                                ? "Opening…"
                                : "Review & pay"}{" "}
                              <ArrowUpRight size={15} />
                            </button>
                          )}
                      </div>
                    );
                  },
                )}
              </div>
              <p className="muted">
                {order.bookingCredited
                  ? "₹500 booking credited against the first milestone."
                  : "₹500 booking fee is separate from the project price."}{" "}
                <Link href="/contact">Questions? Contact the team.</Link>
              </p>
              <details>
                <summary>Booking terms</summary>
                <p className="preserve-lines">{order.refundPolicy}</p>
              </details>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
export function Login() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<"login" | "register" | "reset">("login");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [failed, setFailed] = useState(false);
  const requested = new URLSearchParams(window.location.search).get("next");
  const next =
    requested &&
    ["/start", "/orders", "/admin", "/community"].includes(requested)
      ? requested
      : "/orders";
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!auth) return;
    const data = new FormData(e.currentTarget);
    setBusy(true);
    setStatus("");
    setFailed(false);
    try {
      const email = String(data.get("email"));
      const password = String(data.get("password") || "");
      if (mode === "reset") {
        await sendPasswordResetEmail(auth, email);
        setStatus("If that account exists, a reset email will arrive shortly.");
      } else if (mode === "register") {
        const result = await createUserWithEmailAndPassword(
          auth,
          email,
          password,
        );
        await updateProfile(result.user, {
          displayName: String(data.get("name")),
        });
        await sendEmailVerification(result.user);
        navigate(next);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        navigate(next);
      }
    } catch {
      setFailed(true);
      setStatus(
        "We could not complete sign-in. Check your details or try resetting your password.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function google() {
    if (!auth) return;
    setBusy(true);
    try {
      await signInWithPopup(auth, googleProvider);
      navigate(next);
    } catch {
      setFailed(true);
      setStatus("Google sign-in could not finish. Please try email sign-in.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="container section auth-page">
      <PageTitle title="Sign in" />
      <div className="auth-card">
        <span className="eyebrow">WELCOME TO ARTHQ</span>
        <h1>
          {mode === "register"
            ? "Let’s get acquainted."
            : mode === "reset"
              ? "A fresh start."
              : "Good to see you."}
        </h1>
        <p>Manage your projects, follow payments, and join the conversation.</p>
        {!auth ? (
          <Notice error>
            Account setup is not available yet.{" "}
            <Link href="/contact">Contact the team.</Link>
          </Notice>
        ) : user ? (
          <>
            <Notice>You are signed in as {user.email}.</Notice>
            <Link className="button" href={next}>
              Continue <ArrowRight size={17} />
            </Link>
          </>
        ) : (
          <>
            <form className="form-stack" onSubmit={submit}>
              {mode === "register" && (
                <label>
                  Your name
                  <input
                    name="name"
                    autoComplete="name"
                    required
                    maxLength={80}
                  />
                </label>
              )}
              <label>
                Email
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                />
              </label>
              {mode !== "reset" && (
                <label>
                  Password
                  <input
                    name="password"
                    type="password"
                    minLength={8}
                    autoComplete={
                      mode === "register" ? "new-password" : "current-password"
                    }
                    required
                  />
                </label>
              )}
              <button disabled={busy} className="button">
                {busy
                  ? "One moment…"
                  : mode === "register"
                    ? "Create account"
                    : mode === "reset"
                      ? "Send reset email"
                      : "Sign in"}{" "}
                <ArrowRight size={17} />
              </button>
            </form>
            {mode !== "reset" && (
              <button
                className="button outline full-width"
                disabled={busy}
                onClick={() => void google()}
              >
                Continue with Google
              </button>
            )}
            <div className="auth-links">
              <button
                onClick={() => setMode(mode === "login" ? "register" : "login")}
              >
                {mode === "login" ? "Create an account" : "Back to sign in"}
              </button>
              {mode === "login" && (
                <button onClick={() => setMode("reset")}>
                  Forgot password?
                </button>
              )}
            </div>
          </>
        )}
        {status && <Notice error={failed}>{status}</Notice>}
        <p className="fine-print">
          By continuing, you agree to our <Link href="/terms">terms</Link> and{" "}
          <Link href="/privacy">privacy policy</Link>.
        </p>
      </div>
    </section>
  );
}
export function Discussion({ context }: { context: string }) {
  const { user } = useAuth();
  const { data: site } = useSite();
  const { data: messages = [], error } = useQuery<any[]>({
    queryKey: [
      `/api/messages?context=${encodeURIComponent(context)}`,
      user?.uid,
    ],
    refetchInterval: 12000,
    enabled: context !== "community" || site?.communityEnabled === true,
  });
  const [value, setValue] = useState("");
  const [askGeraki, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  async function post(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatus("");
    try {
      await send("/api/messages", { content: value, context, askGeraki });
      setValue("");
      await queryClient.invalidateQueries({
        queryKey: [`/api/messages?context=${encodeURIComponent(context)}`],
      });
    } catch (e) {
      setStatus((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function report(id: string) {
    try {
      await send(`/api/messages/${id}/report`, {});
      setStatus("Thanks. The team will review this message.");
    } catch (e) {
      setStatus((e as Error).message);
    }
  }
  if (context === "community" && site && !site.communityEnabled)
    return (
      <Notice>
        The community is taking a short break.{" "}
        <Link href="/contact">You can still contact us.</Link>
      </Notice>
    );
  return (
    <section className="discussion">
      <h2>
        {context === "community" ? "The conversation" : "Join the conversation"}
      </h2>
      <p className="muted">
        This is a public space. Be kind, stay on topic, and keep private details
        out of your messages.
      </p>
      {error && <Notice error>{error.message}</Notice>}
      <div className="message-list">
        {messages.length === 0 && !error && (
          <p className="muted">
            Start a conversation. Ask a question or share an idea.
          </p>
        )}
        {messages.map((m) => (
          <article
            key={m.id}
            className={
              m.authorId === "geraki"
                ? "community-message ai"
                : "community-message"
            }
          >
            <div>
              <strong>{m.authorName}</strong>
              <time dateTime={m.createdAt}>
                {new Date(m.createdAt).toLocaleDateString()}
              </time>
              {user && (
                <button
                  className="icon-button"
                  aria-label="Report message"
                  onClick={() => void report(m.id)}
                >
                  <Flag size={14} />
                </button>
              )}
            </div>
            <div className="prose">
              <ReactMarkdown>{m.content}</ReactMarkdown>
            </div>
            {m.model && (
              <small>
                {m.model.includes("Kimi") ? "Kimi K3" : "MiniMax M3"} via
                Featherless
              </small>
            )}
          </article>
        ))}
      </div>
      {user ? (
        <form className="form-stack" onSubmit={post}>
          {!user.emailVerified && (
            <Notice>
              Verify your email to post.{" "}
              <button
                className="text-link"
                type="button"
                onClick={() => {
                  void sendEmailVerification(user)
                    .then(() =>
                      setStatus(
                        "Verification email sent. Sign in again after verifying.",
                      ),
                    )
                    .catch(() =>
                      setStatus(
                        "Please wait a little before requesting another email.",
                      ),
                    );
                }}
              >
                Send verification email
              </button>
            </Notice>
          )}
          <label>
            Your message
            <textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              maxLength={2000}
              required
              rows={3}
            />
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={askGeraki}
              onChange={(e) => setAsk(e.target.checked)}
            />
            Ask Geraki to reply publicly
          </label>
          <button className="button" disabled={busy || !user.emailVerified}>
            {busy ? "Posting…" : "Post message"} <Send size={16} />
          </button>
        </form>
      ) : (
        <Notice>
          <Link href="/login?next=/community">Sign in</Link> to comment or ask
          Geraki a question.
        </Notice>
      )}
      {status && <Notice>{status}</Notice>}
    </section>
  );
}
export function Community() {
  return (
    <>
      <PageTitle title="Community" />
      <section className="container section reading-page">
        <Intro
          eyebrow="IDEAS ARE BETTER SHARED"
          title="A space for curious people."
        >
          <p>
            Ask questions, share what you’re building, and learn together. You
            don’t have to be technical to join in.
          </p>
        </Intro>
        <Discussion context="community" />
      </section>
    </>
  );
}
