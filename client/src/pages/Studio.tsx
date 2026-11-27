import { useState, type FormEvent } from "react";
import { Link, Redirect } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  ArrowUpRight,
  Globe,
  PanelsTopLeft,
  Bot,
  Sparkles,
  Workflow,
  GraduationCap,
  Plus,
  Check,
  Mail,
  Search,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { services, money, type Content } from "@shared/catalog";
import {
  CTA,
  Intro,
  Modal,
  Notice,
  PageTitle,
  useSite,
} from "@/components/business/Shell";
import { WebsitePreview, ProjectPreview, projectVisualType } from "@/components/business/Previews";
import { ApiError, send } from "@/lib/queryClient";
import { Discussion } from "./Workspace";
const icons = [Globe, PanelsTopLeft, Bot, Sparkles, Workflow, GraduationCap];
export const useContent = () =>
  useQuery<Content[]>({ queryKey: ["/api/content"] });
export function ServiceGrid() {
  const [selected, select] = useState<(typeof services)[number] | null>(null);
  return (
    <>
      <div className="service-grid">
        {services.map((s, i) => {
          const Icon = icons[i];
          return (
            <button
              key={s.id}
              className="service-card"
              onClick={() => select(s)}
              aria-label={`Learn about ${s.name}`}
            >
              <div className="service-card-top">
                <Icon size={25} strokeWidth={1.5} />
                <span>0{i + 1}</span>
              </div>
              <h3>{s.name}</h3>
              <p>{s.description}</p>
              <span className="service-more">
                Explore service <Plus size={18} />
              </span>
            </button>
          );
        })}
      </div>
      {selected && (
        <Modal title={selected.name} close={() => select(null)}>
          <p>{selected.detail}</p>
          <ul className="included-list">
            {selected.examples.map((v) => (
              <li key={v}>
                <Check size={17} />
                {v}
              </li>
            ))}
          </ul>
          <p className="muted">
            Every project starts with a conversation about your goals, budget,
            and timeline.
          </p>
          <Link
            href={`/start?service=${selected.id}`}
            className="button"
            onClick={() => select(null)}
          >
            Discuss your idea <ArrowUpRight size={17} />
          </Link>
        </Modal>
      )}
    </>
  );
}
export function WorkCards({ items }: { items: Content[] }) {
  return (
    <div className="work-grid">
      {items.map((item) => (
        <article className="work-card" key={item.id}>
          <Link href={`/projects/${item.slug}`} className="work-image-link">
            <ProjectPreview type={projectVisualType(item.category)} image={item.imageUrl} title={item.title} />
          </Link>
          <div className="work-card-bottom">
            <div>
              <span className="eyebrow">{item.category}</span>
              <h3>
                <Link href={`/projects/${item.slug}`}>{item.title}</Link>
              </h3>
              <p>{item.excerpt}</p>
            </div>
            <Link
              href={`/projects/${item.slug}`}
              className="icon-link"
              aria-label={`View ${item.title}`}
            >
              <ArrowUpRight size={22} />
            </Link>
          </div>
          {item.liveUrl && (
            <a
              href={item.liveUrl}
              target="_blank"
              rel="noreferrer"
              className="text-link"
            >
              Visit live site <ArrowUpRight size={15} />
            </a>
          )}
        </article>
      ))}
    </div>
  );
}
export function Home() {
  const { data = [] } = useContent();
  const projects = data
    .filter((p) => p.kind === "project" && p.featured)
    .slice(0, 2);
  const articles = data
    .filter((p) => p.kind !== "project" && p.featured)
    .slice(0, 3);
  return (
    <>
      <PageTitle title="Websites, apps & automation, made for you" />
      <section className="container hero">
        <div className="hero-copy">
          <div className="availability">
            <span /> INDEPENDENT DIGITAL STUDIO · INDIA
          </div>
          <h1>
            Your next idea.
            <br />
            Made <em>real.</em>
            <span className="hero-dot">✳</span>
          </h1>
          <p>
            Websites, apps, bots, and clever little tools.
            <br className="desktop-break" /> Custom-built for your business,
            without the complexity.
          </p>
          <div className="hero-actions">
            <Link href="/start" className="button">
              Let’s build something <ArrowUpRight size={18} />
            </Link>
            <Link href="/projects" className="text-link">
              Explore our work <ArrowRight size={17} />
            </Link>
          </div>
          <div className="hero-note">
            <span className="mini-brand">g.</span>
            <span>
              Not sure where to start?
              <br />
              <Link href="/start">
                Talk it through with Geraki, our AI assistant ↗
              </Link>
            </span>
          </div>
        </div>
        <div className="hero-art">
          <WebsitePreview />
          <div className="floating-note">
            <span>✳</span> YOUR VISION.
            <br />
            OUR CRAFT.
          </div>
        </div>
      </section>
      <div className="service-marquee">
        <div className="container">
          <span>WEBSITES</span>
          <i>✳</i>
          <span>APPS</span>
          <i>✳</i>
          <span>BOTS & AUTOMATION</span>
          <i>✳</i>
          <span>CUSTOM AI</span>
          <i>✳</i>
          <span>MADE FOR YOU</span>
        </div>
      </div>
      <section className="container section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">01 / WHAT WE DO</span>
            <h2>
              Good ideas deserve
              <br />
              the right tools.
            </h2>
          </div>
          <p>
            From a first website to a tool that saves your team hours. Tell us
            what you need. We’ll work out how to build it.
          </p>
        </div>
        <ServiceGrid />
      </section>
      <section className="work-section">
        <div className="container section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">02 / SELECTED WORK</span>
              <h2>
                A few things
                <br />
                we’ve been building.
              </h2>
            </div>
            <Link href="/projects" className="text-link">
              See all work <ArrowUpRight size={18} />
            </Link>
          </div>
          {projects.length ? (
            <WorkCards items={projects} />
          ) : (
            <p>
              Selected projects are being prepared.{" "}
              <Link href="/start">Tell us what you’d like to build.</Link>
            </p>
          )}
        </div>
      </section>
      <section className="container section process-section">
        <div>
          <span className="eyebrow">03 / SIMPLE FROM THE START</span>
          <h2>
            From “what if”
            <br />
            to <em>“it’s live.”</em>
          </h2>
          <p>
            No technical vocabulary required.
            <br />
            Just a clear process and a team that listens.
          </p>
          <Link href="/process" className="text-link">
            How we work <ArrowRight size={17} />
          </Link>
        </div>
        <div className="process-list">
          {[
            [
              "Tell us your idea",
              "Chat with Geraki about what you need, your budget, and your timeline.",
            ],
            [
              "Make a plan together",
              "Choose a suitable package, book for ₹500, and agree the scope with our team.",
            ],
            [
              "Build, review, launch",
              "Follow the progress, give feedback, and pay at agreed project milestones.",
            ],
          ].map(([title, body], i) => (
            <div className="process-step" key={title}>
              <span>0{i + 1}</span>
              <div>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
              <ArrowUpRight size={20} />
            </div>
          ))}
        </div>
      </section>
      <section className="container geraki-banner">
        <div className="geraki-emblem">
          g<span>✳</span>
        </div>
        <div>
          <span className="eyebrow">MEET GERAKI</span>
          <h2>
            A sounding board
            <br />
            for your next big thing.
          </h2>
          <p>
            Explore an idea, ask a question, or work through a budget. Our AI
            assistant helps you take the first step.
          </p>
          <Link href="/start" className="button light">
            Start a conversation <ArrowUpRight size={17} />
          </Link>
        </div>
        <span className="banner-side-note">
          NO PRESSURE.
          <br />
          JUST POSSIBILITIES.
        </span>
      </section>
      {articles.length > 0 && (
        <section className="container section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">FROM THE STUDIO</span>
              <h2>Ideas worth sharing.</h2>
            </div>
            <Link href="/blog" className="text-link">
              All insights <ArrowUpRight size={18} />
            </Link>
          </div>
          <ArticleCards items={articles} />
        </section>
      )}
      <CTA />
    </>
  );
}
export function Services() {
  return (
    <>
      <PageTitle title="Services" />
      <section className="container section">
        <Intro
          eyebrow="WHAT WE CAN BUILD TOGETHER"
          title="Digital work. Built around you."
        >
          <p>
            Choose a starting point. We’ll help turn it into something useful.
          </p>
        </Intro>
        <ServiceGrid />
        <div className="note-row">
          <span>Something a little different?</span>
          <Link href="/start" className="text-link">
            Tell us about it <ArrowUpRight size={17} />
          </Link>
        </div>
      </section>
      <CTA />
    </>
  );
}
export function Projects() {
  const { data = [], isPending, error } = useContent();
  const [filter, setFilter] = useState("All work");
  const items = data.filter((p) => p.kind === "project");
  const filters = ["All work", ...new Set(items.map((p) => p.category))];
  return (
    <>
      <PageTitle title="Our work" />
      <section className="container section">
        <Intro eyebrow="SELECTED PROJECTS" title="Ideas, brought to life.">
          <p>
            A look at our public projects and the possibilities behind them.
          </p>
        </Intro>
        <div className="filter-row">
          {filters.map((v) => (
            <button
              key={v}
              className={filter === v ? "chip active" : "chip"}
              aria-pressed={filter === v}
              onClick={() => setFilter(v)}
            >
              {v}
            </button>
          ))}
        </div>
        {isPending ? (
          <Notice>Loading projects…</Notice>
        ) : error ? (
          <Notice error>{error.message}</Notice>
        ) : (
          <WorkCards
            items={items.filter(
              (p) => filter === "All work" || p.category === filter,
            )}
          />
        )}
        {!isPending && !error && !items.length && (
          <Notice>
            New project stories are on their way. Talk to us about your idea in
            the meantime.
          </Notice>
        )}
      </section>
      <CTA />
    </>
  );
}
function ArticleCards({ items }: { items: Content[] }) {
  return (
    <div className="article-grid">
      {items.map((p) => (
        <article key={p.id} className="article-card">
          <span className="eyebrow">
            {p.kind === "report" ? "REPORT" : "ARTICLE"} / {p.category}
          </span>
          <h3>
            <Link href={`/blog/${p.slug}`}>{p.title}</Link>
          </h3>
          <p>{p.excerpt}</p>
          <Link href={`/blog/${p.slug}`} className="text-link">
            Read more <ArrowUpRight size={16} />
          </Link>
        </article>
      ))}
    </div>
  );
}
export function Blog() {
  const { data = [], isPending, error, refetch } = useContent();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const items = data.filter((p) => p.kind !== "project");
  const filtered = items.filter(
    (p) =>
      (filter === "All" || p.kind === (filter === "Articles" ? "article" : "report")) &&
      `${p.title} ${p.excerpt} ${p.category}`.toLowerCase().includes(search.trim().toLowerCase()),
  );
  return (
    <>
      <PageTitle title="Articles & reports" />
      <section className="container section">
        <Intro
          eyebrow="FROM THE STUDIO"
          title="A little insight goes a long way."
        >
          <p>
            Practical ideas, project updates, and reports from ArtHQ.
          </p>
        </Intro>
        <label className="blog-search">
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">Search articles and reports</span>
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search insights…" maxLength={200} />
        </label>
        <div className="filter-row">
          {["All", "Articles", "Reports"].map((v) => (
            <button
              className={filter === v ? "chip active" : "chip"}
              key={v}
              aria-pressed={filter === v}
              onClick={() => setFilter(v)}
            >
              {v}
            </button>
          ))}
        </div>
        {isPending ? (
          <Notice>Loading insights…</Notice>
        ) : error ? (
          <Notice error>{error.message} <button className="text-link" onClick={() => void refetch()}>Try again</button></Notice>
        ) : (
          <ArticleCards items={filtered} />
        )}
        {!isPending && !error && items.length > 0 && filtered.length === 0 && (
          <Notice>{search.trim() ? "No insights match your search. Try another phrase or choose All." : `No ${filter.toLowerCase()} published yet.`}</Notice>
        )}
        {!isPending && !error && !items.length && (
          <div className="empty-state">
            <Sparkles />
            <h2>Good things are on the way.</h2>
            <p>
              We’re preparing our next articles and reports. Have a topic in
              mind?
            </p>
            <Link href="/community" className="text-link">
              Join the conversation <ArrowRight size={16} />
            </Link>
          </div>
        )}
      </section>
    </>
  );
}
export function Detail({ slug, section }: { slug: string; section: "blog" | "projects" }) {
  const { data, error, isPending, refetch } = useQuery<Content>({
    queryKey: [`/api/content/${encodeURIComponent(slug)}`],
  });
  if (isPending)
    return (
      <div className="container section">
        <Notice>Loading…</Notice>
      </div>
    );
  if (error && !(error instanceof ApiError && error.status === 404))
    return (
      <section className="container section">
        <PageTitle title="Unable to load this page" />
        <h1>We couldn’t load this page.</h1>
        <Notice error>{error.message}</Notice>
        <button className="button" onClick={() => void refetch()}>
          Try again
        </button>
      </section>
    );
  if (!data || error) return <NotFound />;
  const canonicalSection = data.kind === "project" ? "projects" : "blog";
  if (section !== canonicalSection) return <Redirect to={`/${canonicalSection}/${data.slug}`} />;
  return (
    <>
      <PageTitle title={data.title} />
      <article className="container section reading-page">
        <Link
          href={data.kind === "project" ? "/projects" : "/blog"}
          className="text-link"
        >
          ← Back to {data.kind === "project" ? "work" : "insights"}
        </Link>
        <Intro eyebrow={`${data.kind} / ${data.category}`} title={data.title}>
          <p>{data.excerpt}</p>
        </Intro>
        {data.kind === "project" ? (
          <ProjectPreview type={projectVisualType(data.category)} image={data.imageUrl} title={data.title} />
        ) : (
          data.imageUrl && (
            <img
              className="article-hero"
              src={data.imageUrl}
              alt={data.title}
            />
          )
        )}
        <div className="prose">
          <ReactMarkdown>{data.body}</ReactMarkdown>
        </div>
        <div className="inline-actions">
          {data.liveUrl && (
            <a
              href={data.liveUrl}
              target="_blank"
              rel="noreferrer"
              className="button"
            >
              Visit live site <ArrowUpRight size={17} />
            </a>
          )}
          {data.sourceUrl && (
            <a
              href={data.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="button outline"
            >
              {data.kind === "project" ? "View project source" : "View source"} <ArrowUpRight size={17} />
            </a>
          )}
        </div>
        {data.kind === "project" ? (
          <div className="detail-cta">
            <h2>Have a similar idea?</h2>
            <Link href="/start" className="button">
              Let’s talk about it <ArrowRight size={17} />
            </Link>
          </div>
        ) : (
          <Discussion context={`post:${data.id}`} />
        )}
      </article>
    </>
  );
}
export function Process() {
  const { data } = useSite();
  return (
    <>
      <PageTitle title="How it works" />
      <section className="container section">
        <Intro
          eyebrow="CLEAR STEPS. SHARED EXPECTATIONS."
          title="A good process makes good work."
        >
          <p>Explore first. Agree the plan. Build together.</p>
        </Intro>
        <div className="process-full">
          {[
            [
              "01",
              "Start with a conversation",
              "Tell Geraki what you want to achieve, who it is for, your budget, and your timeline. The conversation is free.",
            ],
            [
              "02",
              "Choose your direction",
              "Geraki explains the packages our team has published. When you’re interested, review your brief and pay ₹500 to book your project.",
            ],
            [
              "03",
              "Agree the scope · 30%",
              `Our team reviews the brief and confirms the scope and total price. You can review these before the first 30% payment.${data?.bookingCredited ? " Your ₹500 booking fee is credited against this payment." : ""}`,
            ],
            [
              "04",
              "Review the next phase · 40%",
              "After the second phase is completed, review the work and pay the next 40%.",
            ],
            [
              "05",
              "Final handover · 30%",
              "Review the final work and complete the remaining 30% payment for full submission and handover.",
            ],
          ].map(([n, title, body]) => (
            <div className="process-step" key={n}>
              <span>{n}</span>
              <div>
                <h2>{title}</h2>
                <p>{body}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="muted">
          The final scope, timeline, deliverables, and payment terms are
          confirmed for your project.{" "}
          <Link href="/refunds">Read payment and refund information.</Link>
        </p>
      </section>
      <CTA />
    </>
  );
}
export function Contact() {
  const { data } = useSite();
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const values = new FormData(form);
    setBusy(true);
    setFailed(false);
    setStatus("");
    try {
      await send("/api/contact", {
        name: values.get("name"),
        email: values.get("email"),
        serviceId: values.get("service"),
        message: values.get("message"),
        consent: values.get("consent") === "on",
        website: values.get("website"),
      });
      setStatus("Thanks. Your message is with the team.");
      form.reset();
    } catch (error) {
      setFailed(true);
      setStatus((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle title="Contact" />
      <section className="container section">
        <Intro eyebrow="LET’S TALK" title="Tell us what you have in mind.">
          <p>
            A rough idea is enough. We’ll help you figure out the next step.
          </p>
        </Intro>
        <div className="contact-grid">
          <div>
            <div className="contact-panel">
              <Sparkles size={30} />
              <h2>Want to explore it together?</h2>
              <p>
                Geraki can help you work through the details, compare available
                packages, and prepare your project brief.
              </p>
              <Link href="/start" className="button">
                Chat with Geraki <ArrowUpRight size={17} />
              </Link>
            </div>
            <a
              className="email-link"
              href={`mailto:${data?.contactEmail || "thewhitefalcon13@proton.me"}`}
            >
              <Mail size={19} />
              {data?.contactEmail || "thewhitefalcon13@proton.me"}
            </a>
            <p className="muted">
              Prefer a person? Send the team a message here.
            </p>
          </div>
          <form className="form-stack" onSubmit={submit}>
            <label>
              Your name
              <input
                name="name"
                autoComplete="name"
                maxLength={100}
                required
                placeholder="How should we call you?"
              />
            </label>
            <label>
              Email address
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@company.com"
              />
            </label>
            <label>
              What can we help with?
              <select name="service" required>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
                <option value="other">Something else</option>
              </select>
            </label>
            <label>
              Your idea
              <textarea
                name="message"
                required
                maxLength={5000}
                rows={5}
                placeholder="A little about your business and what you’d like to do…"
              />
            </label>
            <label className="honeypot" aria-hidden="true">
              Website
              <input name="website" tabIndex={-1} autoComplete="off" />
            </label>
            <label className="checkbox-label">
              <input type="checkbox" name="consent" required />I agree to be
              contacted about this enquiry.{" "}
              <Link href="/privacy">Privacy policy</Link>
            </label>
            <button className="button" disabled={busy}>
              {busy ? "Sending…" : "Send your message"}
              <ArrowUpRight size={17} />
            </button>
            {status && <Notice error={failed}>{status}</Notice>}
          </form>
        </div>
      </section>
    </>
  );
}
export function Policies({ kind }: { kind: "privacy" | "terms" | "refunds" }) {
  const { data } = useSite();
  const title =
    kind === "privacy"
      ? "Your privacy matters."
      : kind === "terms"
        ? "Clear expectations, from the start."
        : "Payments & refunds.";
  return (
    <>
      <PageTitle
        title={
          kind === "privacy"
            ? "Privacy"
            : kind === "terms"
              ? "Terms"
              : "Payments & refunds"
        }
      />
      <section className="container section reading-page">
        <Intro eyebrow="ARTHQ · INDIA" title={title} />
        <div className="prose">
          {kind === "privacy" ? (
            <>
              <h2>What we collect</h2>
              <p>
                We process the information you submit: contact details, project
                requirements, budget, account details, and messages. We use it
                to respond, prepare work, manage your orders, and operate this
                site.
              </p>
              <h2>Geraki and public conversations</h2>
              <p>
                Geraki is an AI assistant powered by MiniMax M3 and Kimi K3
                through Featherless. Messages you send to Geraki are processed
                by Featherless. Please do not include passwords, payment card
                details, API keys, or sensitive personal records. Private
                conversation history stays in your browser tab until cleared;
                the recent conversation is sent to the provider when you ask a
                question. A project brief is saved only when you submit it.
              </p>
              <p>
                Community messages and article comments are public. Keep private
                project details in the private project flow or contact form.
              </p>
              <h2>Service providers</h2>
              <p>
                Firebase supports account authentication and data storage.
                Razorpay processes payments; we store payment references and
                status, not card credentials. External social and project links
                follow their own privacy policies.
              </p>
              <h2>Control over your information</h2>
              <p>
                We use account information and submitted project details only
                for service delivery and site operation. Records are kept while
                needed to respond, deliver work, resolve disputes, or meet
                applicable recordkeeping requirements. Contact us to request
                access, correction, or deletion. We do not add advertising
                trackers.
              </p>
            </>
          ) : kind === "terms" ? (
            <>
              <h2>Who we are</h2>
              <p>
                ArtHQ is a digital services studio based in India and a
                subsidiary of{" "}
                <a href="https://rafalwebcraft.online">RafalWebCraft</a>. We
                build websites, applications, bots, scripts, and AI tools, and
                offer AI training and support.
              </p>
              <h2>Project agreement</h2>
              <p>
                A conversation or booking is not an agreement to deliver an
                unspecified project. The team confirms scope, price, timeline,
                revisions, handover, and any ongoing costs before work begins.
                Geraki can explain published packages but cannot approve a
                project or change agreed prices.
              </p>
              <h2>Your responsibilities</h2>
              <p>
                Provide accurate requirements and content you are entitled to
                use. Review deliverables and raise questions at each agreed
                milestone. Do not use this site to post abuse, spam, private
                information about others, or unlawful content.
              </p>
              <h2>Community and AI</h2>
              <p>
                Geraki’s responses are AI-generated and can contain mistakes.
                Confirm project commitments with the team. Public contributions
                may be moderated or removed. We do not automatically publish
                AI-generated articles as the business’s approved work.
              </p>
              <h2>Changes and cancellations</h2>
              <p>
                Changes beyond the agreed scope need a revised agreement.
                Payment and refund terms are shown before payment and recorded
                with your booking.
              </p>
            </>
          ) : (
            <>
              <h2>Free discussion, then ₹500 booking</h2>
              <p>
                Discuss your requirements and budget with Geraki first. When a
                suitable package is available and you are ready, review your
                brief and the terms before making the ₹500 project booking
                payment.
              </p>
              <h2>30% / 40% / 30%</h2>
              <p>
                After the team approves the scope and price, the first project
                payment is 30%. Another 40% is payable after second-phase
                completion, followed by the remaining 30% for complete
                submission and handover.
              </p>
              <p>
                {data?.bookingCredited
                  ? "The ₹500 booking fee is credited against your first 30% payment."
                  : data
                    ? "The ₹500 booking fee is separate from the agreed project price."
                    : "The treatment of the booking fee is displayed before payment."}
              </p>
              <h2>Refunds and cancellation</h2>
              {data?.refundPolicy ? (
                <p className="preserve-lines">{data.refundPolicy}</p>
              ) : (
                <p>
                  Online booking remains closed until ArtHQ publishes
                  its cancellation and refund terms. Contact the team to discuss
                  your project; no payment is required to enquire.
                </p>
              )}
              <h2>Payment confirmation</h2>
              <p>
                Payments are processed by Razorpay in INR. A booking or
                milestone is marked paid only after the server verifies the
                payment. If a payment is pending, contact the team before paying
                again. Your rights under applicable law are not limited by these
                terms.
              </p>
            </>
          )}
          <h2>Contact</h2>
          <p>
            ArtHQ, India
            {data?.businessAddress ? ` · ${data.businessAddress}` : ""}
          </p>
          <a
            href={`mailto:${data?.contactEmail || "thewhitefalcon13@proton.me"}`}
          >
            {data?.contactEmail || "thewhitefalcon13@proton.me"}
          </a>
        </div>
      </section>
    </>
  );
}
export function NotFound() {
  return (
    <section className="container section empty-state">
      <PageTitle title="Page not found" />
      <span className="eyebrow">404 / A SMALL DETOUR</span>
      <h1>This page isn’t here.</h1>
      <p>Let’s get you back to something useful.</p>
      <Link href="/" className="button">
        Back to home <ArrowRight size={18} />
      </Link>
    </section>
  );
}
