import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { ArrowUpRight, Menu, X, ArrowRight, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import {
  defaultSettings,
  type BusinessSettings,
  type ServicePackage,
} from "@shared/catalog";
import { GerakiPopup } from "./GerakiChat";
export type Site = BusinessSettings & {
  checkoutAvailable: boolean;
  assistantAvailable: boolean;
  packages: ServicePackage[];
};
export function useSite() {
  return useQuery<Site>({ queryKey: ["/api/site"] });
}
export function PageTitle({ title }: { title: string }) {
  useEffect(() => {
    document.title = `${title} · ArtHQ`;
  }, [title]);
  return null;
}
export function Shell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [location] = useLocation();
  const { user, isAdmin } = useAuth();
  const { data } = useSite();
  useEffect(() => {
    setOpen(false);
    setChatOpen(false);
    window.scrollTo(0, 0);
  }, [location]);
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <div className="container header-inner">
          <Link href="/" className="wordmark" aria-label="ArtHQ home">
            <span className="brand-mark">
              a<span>.</span>
            </span>
            ArtHQ
          </Link>
          <button
            className="icon-button mobile-menu"
            aria-label={open ? "Close navigation" : "Open navigation"}
            aria-expanded={open}
            aria-controls="main-navigation"
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </button>
          <nav
            id="main-navigation"
            onKeyDown={(e) => { if (e.key === "Escape") { setOpen(false); document.querySelector<HTMLButtonElement>(".mobile-menu")?.focus(); } }}
            className={open ? "main-nav is-open" : "main-nav"}
            aria-label="Main navigation"
          >
            <Link href="/services" aria-current={location === "/services" || location.startsWith("/services/") ? "page" : undefined}>Services</Link>
            <Link href="/projects" aria-current={location === "/projects" || location.startsWith("/projects/") ? "page" : undefined}>Work</Link>
            <Link href="/process" aria-current={location === "/process" || location.startsWith("/process/") ? "page" : undefined}>How it works</Link>
            <Link href="/blog" aria-current={location === "/blog" || location.startsWith("/blog/") ? "page" : undefined}>Insights</Link>
            {user && (
              <Link href={isAdmin ? "/admin" : "/orders"}>
                {isAdmin ? "Studio admin" : "My projects"}
              </Link>
            )}
            <Link href="/start" className="button small">
              Let’s talk <ArrowUpRight size={16} />
            </Link>
          </nav>
        </div>
      </header>
      <main id="main">{children}</main>
      <footer className="site-footer">
        <div className="container">
          <div className="footer-top">
            <div>
              <span className="eyebrow">
                GOOD THINGS START WITH A CONVERSATION
              </span>
              <h2>
                Have something
                <br />
                in mind<span className="accent">?</span>
              </h2>
            </div>
            <Link
              className="round-link"
              href="/start"
              aria-label="Talk to Geraki"
            >
              <ArrowUpRight size={40} />
            </Link>
          </div>
          <div className="footer-bottom">
            <div>
              <Link href="/" className="wordmark">
                ArtHQ
              </Link>
              <p>
                Custom digital work. A human approach.
                <br />
                Based in India. Building for you.
              </p>
              <p>
                ArtHQ is a subsidiary of{" "}
                <a
                  href="https://rafalwebcraft.online"
                  target="_blank"
                  rel="noreferrer"
                >
                  rafalwebcraft.online
                </a>
                .
              </p>
            </div>
            <div className="footer-links">
              <Link href="/contact">Contact</Link>
              <Link href="/community">Community</Link>
              <Link href="/blog" aria-current={location === "/blog" || location.startsWith("/blog/") ? "page" : undefined}>Articles & reports</Link>
              <Link href={user ? "/orders" : "/login"}>
                {user ? "My projects" : "Sign in"}
              </Link>
            </div>
            <div className="footer-links">
              {(
                data?.socials ||
                defaultSettings.socials.filter((s) => s.enabled)
              ).map((s) => (
                <a key={s.label} href={s.url} target="_blank" rel="noreferrer">
                  {s.label} <ArrowUpRight size={13} />
                </a>
              ))}
            </div>
          </div>
          <div className="footer-legal">
            <span>© {new Date().getFullYear()} ArtHQ</span>
            <div>
              <Link href="/privacy">Privacy</Link>
              <Link href="/terms">Terms</Link>
              <Link href="/refunds">Payments & refunds</Link>
            </div>
          </div>
        </div>
      </footer>
      {location !== "/start" && !location.startsWith("/admin") && (
        <button
          onClick={() => setChatOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={chatOpen}
          className="geraki-launcher"
          aria-label="Discuss your project with Geraki"
        >
          <Sparkles size={18} />
          <span>Ask Geraki</span>
        </button>
      )}
      {chatOpen && <GerakiPopup close={() => setChatOpen(false)} />}
    </>
  );
}
export function Modal({
  title,
  children,
  close,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    dialog?.showModal();
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = original;
      queueMicrotask(() => {
        if (opener?.isConnected) opener.focus();
      });
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby="modal-title"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="modal-inner">
        <button
          className="icon-button modal-close"
          onClick={close}
          aria-label="Close details"
        >
          <X />
        </button>
        <h2 id="modal-title">{title}</h2>
        {children}
      </div>
    </dialog>
  );
}
export function Intro({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-intro">
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      {children && <div className="intro-copy">{children}</div>}
    </div>
  );
}
export function Notice({
  children,
  error = false,
}: {
  children: ReactNode;
  error?: boolean;
}) {
  return (
    <div
      className={`notice ${error ? "error" : ""}`}
      role={error ? "alert" : "status"}
    >
      {children}
    </div>
  );
}
export function CTA() {
  return (
    <section className="container cta-strip">
      <div>
        <span className="eyebrow">YOUR IDEA IS A GOOD PLACE TO START</span>
        <h2>Tell us what you’re thinking.</h2>
        <p>You don’t need a technical brief. Just a goal.</p>
      </div>
      <Link href="/start" className="button">
        Talk to Geraki <ArrowRight size={18} />
      </Link>
    </section>
  );
}
