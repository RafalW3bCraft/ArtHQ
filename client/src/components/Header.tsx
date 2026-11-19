import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";

export function Wordmark() {
  return (
    <a className="wordmark" href="/" aria-label="ArtHQ home">
      <img src="/mark.svg" alt="" width="36" height="36" />
      ArtHQ
    </a>
  );
}

export function Header() {
  const { theme, toggleTheme } = useTheme();
  const [path] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuToggle = useRef<HTMLButtonElement>(null);
  const inWorkspace = path === "/admin" || path === "/dashboard";
  useEffect(() => setMenuOpen(false), [path]);
  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuToggle.current?.focus();
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  return (
    <>
      <a href="#main" className="skip">Skip to content</a>
      <header className="mast">
        <div className="wrap mast-inner">
          <Wordmark />
          <nav
            id="mobile-main-navigation"
            className="main-nav"
            aria-label="Main navigation"
            data-open={menuOpen}
          >
            <a href="/#work" onClick={() => setMenuOpen(false)}>Work</a>
            <a href="/#achievement" onClick={() => setMenuOpen(false)}>Hall of Achievement</a>
            <a href="/#services" onClick={() => setMenuOpen(false)}>Services</a>
            <a href="/#contact" onClick={() => setMenuOpen(false)}>Contact</a>
          </nav>
          <div className="mast-actions">
            <button
              type="button"
              ref={menuToggle}
              className="menu-toggle"
              aria-expanded={menuOpen}
              aria-controls="mobile-main-navigation"
              aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span aria-hidden="true">{menuOpen ? "×" : "☰"}</span>
            </button>
            <button
              type="button"
              className="theme"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            >
              <span aria-hidden="true" />
            </button>
            <a className="outline-button small" href={inWorkspace ? "/dashboard" : "/auth"}>
              {inWorkspace ? "Client portal" : "Client sign in"}
            </a>
          </div>
        </div>
      </header>
    </>
  );
}
