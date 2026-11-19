import { useEffect, useRef, useState, type KeyboardEvent } from "react";

const projects = [
  {
    name: "4AM SOCIETY",
    kind: "Coffee & editorial",
    host: "the4amsociety.com",
    href: "https://the4amsociety.com/",
    image: "4am-society",
    alt: "4AM SOCIETY’s coffee journal with a contour map and sourcing route",
    description:
      "An expedition journal tracing coffee origins through field notes, maps, and dispatches.",
  },
  {
    name: "RafalW3bCraft",
    kind: "Cybersecurity & engineering",
    host: "rafalwebcraft.online",
    href: "https://rafalwebcraft.online/",
    image: "rafalwebcraft",
    alt: "RafalW3bCraft portfolio presenting software, web, AI, and cybersecurity work",
    description:
      "The parent studio’s portfolio of software engineering, web development, AI, and cybersecurity work.",
  },
  {
    name: "Ribison Chemicals",
    kind: "Industrial manufacturing",
    host: "ribison.com",
    href: "https://ribison.com/",
    image: "ribison",
    alt: "Ribison Chemicals website introducing its industrial chemistry solutions",
    description:
      "An industrial website introducing its chemical products and applications.",
  },
  {
    name: "Creative Laser Art",
    kind: "Laser engraving atelier",
    host: "creativelaser-art.web.app",
    href: "https://creativelaser-art.web.app/",
    image: "creative-laser-art",
    alt: "Creative Laser Art website for a bespoke laser engraving atelier",
    description:
      "A website for a bespoke hardwood laser cutting and engraving atelier.",
  },
  {
    name: "FinServiceBot",
    kind: "Telegram bot",
    host: "@FinServiceBot",
    href: "https://t.me/FinServiceBot",
    artwork: "finservice",
    description: "A Telegram bot project developed by ArtHQ.",
  },
  {
    name: "Smart Growly Bot",
    kind: "Telegram bot",
    host: "@Smart_Growly_Bot",
    href: "https://t.me/Smart_Growly_Bot",
    artwork: "smart-growly",
    description: "A Telegram bot project developed by ArtHQ.",
  },
] as const;

const services = [
  {
    number: "01",
    title: "Websites",
    description: "Brand-led websites, portals, and content experiences.",
  },
  {
    number: "02",
    title: "Mobile apps",
    description: "Mobile interfaces for product and service workflows.",
  },
  {
    number: "03",
    title: "AI assistants",
    description: "Conversational tools for customer support and internal knowledge.",
  },
  {
    number: "04",
    title: "Telegram bots",
    description: "Task-focused bots and automations built for Telegram.",
  },
  {
    number: "05",
    title: "E-commerce",
    description: "Product catalogues and commerce journeys shaped around your business.",
  },
  {
    number: "06",
    title: "Other digital work",
    description: "Bring us the goal. We’ll review the brief and recommend a useful next step.",
  },
] as const;

const workflow = [
  { number: "01", title: "Define", description: "Share the goal, audience, and essentials." },
  { number: "02", title: "Plan", description: "Agree the scope and a practical delivery plan." },
  { number: "03", title: "Build", description: "Review progress and shape the work together." },
  { number: "04", title: "Support", description: "Follow project updates and request support in the portal." },
] as const;

type Project = (typeof projects)[number];

function ProjectArtwork({ project }: { project: Project }) {
  if ("image" in project) {
    return (
      <img
        src={`/media/${project.image}.webp`}
        alt={project.alt}
        width="1440"
        height="900"
        loading="lazy"
      />
    );
  }

  return (
    <div className={`project-art ${project.artwork}`} aria-hidden="true">
      <span>Telegram project</span>
      <strong>{project.host}</strong>
      <i aria-hidden="true">↗</i>
    </div>
  );
}

function ProjectCard({ project, index }: { project: Project; index: number }) {
  return (
    <article
      className={`work-card project-slide ${"image" in project ? project.image : project.artwork}`}
      role="group"
      aria-roledescription="slide"
      aria-label={`${index + 1} of ${projects.length}: ${project.name}`}
      data-carousel-slide
    >
      <a
        className={`site-image ${"artwork" in project ? "bot-image" : ""}`}
        href={project.href}
        aria-label={`Open ${project.name}`}
        target="_blank"
        rel="noreferrer"
      >
        <ProjectArtwork project={project} />
        <span className="image-index" aria-hidden="true">
          {String(index + 1).padStart(2, "0")}
        </span>
      </a>
      <div className="work-copy">
        <div className="work-meta">
          <span>{project.kind}</span>
          <span>{project.host}</span>
        </div>
        <h3>
          <a href={project.href} target="_blank" rel="noreferrer">
            {project.name}
          </a>
        </h3>
        <p>{project.description}</p>
        <a className="text-link" href={project.href} target="_blank" rel="noreferrer">
          {"image" in project ? "Visit website" : "Open on Telegram"} <span aria-hidden="true">↗</span>
        </a>
      </div>
    </article>
  );
}

function useReducedMotionPreference() {
  const [reducedMotion, setReducedMotion] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return reducedMotion;
}

function WorkCarousel() {
  const rail = useRef<HTMLDivElement>(null);
  const carousel = useRef<HTMLElement>(null);
  const scrollSyncTimer = useRef<number | undefined>(undefined);
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [manualPlay, setManualPlay] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [inView, setInView] = useState(false);
  const reducedMotion = useReducedMotionPreference();
  const autoplay =
    !paused &&
    inView &&
    !reducedMotion &&
    (manualPlay || (!hovered && !focused));

  useEffect(() => {
    const node = carousel.current;
    if (!node || !("IntersectionObserver" in window)) {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.15 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  function goTo(index: number, behavior: ScrollBehavior = "smooth") {
    const slides = rail.current?.querySelectorAll<HTMLElement>("[data-carousel-slide]");
    if (!slides?.length) return;
    const nextIndex = (index + slides.length) % slides.length;
    setActiveIndex(nextIndex);
    slides[nextIndex].scrollIntoView({ behavior: reducedMotion ? "instant" : behavior, block: "nearest", inline: "start" });
  }

  useEffect(() => {
    if (!autoplay) return;
    const interval = window.setInterval(() => goTo(activeIndex + 1), 6500);
    return () => window.clearInterval(interval);
  }, [activeIndex, autoplay, reducedMotion]);

  useEffect(() => () => window.clearTimeout(scrollSyncTimer.current), []);

  function handleRailKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== rail.current) return;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      setPaused(true);
      setManualPlay(false);
      goTo(activeIndex + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      setPaused(true);
      setManualPlay(false);
      goTo(activeIndex - 1);
    }
  }

  return (
    <section
      ref={carousel}
      className="achievement-section"
      id="achievement"
      aria-labelledby="achievement-title"
      aria-roledescription="carousel"
      aria-label="Hall of Achievement projects"
      onMouseEnter={() => {
        setHovered(true);
        setManualPlay((playing) => playing ? false : playing);
      }}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => {
        setFocused(true);
        setManualPlay((playing) => playing ? false : playing);
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
      }}
    >
      <div className="wrap">
        <header className="achievement-heading">
          <div>
            <span className="kicker"><span className="rule" /> ArtHQ / Selected projects</span>
            <h2 id="achievement-title">Hall of Achievement<span>.</span></h2>
          </div>
          <div className="gallery-sidecopy">
            <p>Websites and digital projects, each linked to its live destination.</p>
            <p className="gallery-count" aria-live={paused ? "polite" : "off"}>
              {String(activeIndex + 1).padStart(2, "0")} <span>/</span> {String(projects.length).padStart(2, "0")}
            </p>
          </div>
        </header>
        <div
          ref={rail}
          className="project-rail hide-scrollbar"
          tabIndex={0}
          aria-label="Project slides. Use the left and right arrow keys to navigate."
          onKeyDown={handleRailKeyDown}
          onPointerDown={() => {
            setPaused(true);
            setManualPlay(false);
          }}
          onScroll={() => {
            window.clearTimeout(scrollSyncTimer.current);
            scrollSyncTimer.current = window.setTimeout(() => {
              const slides = rail.current?.querySelectorAll<HTMLElement>("[data-carousel-slide]");
              if (!slides?.length || !rail.current) return;
              const left = rail.current.getBoundingClientRect().left;
              let nearest = 0;
              let distance = Number.POSITIVE_INFINITY;
              slides.forEach((slide, index) => {
                const nextDistance = Math.abs(slide.getBoundingClientRect().left - left);
                if (nextDistance < distance) {
                  nearest = index;
                  distance = nextDistance;
                }
              });
              setActiveIndex(nearest);
            }, 140);
          }}
        >
          {projects.map((project, index) => (
            <ProjectCard key={project.name} project={project} index={index} />
          ))}
        </div>
        <div className="carousel-controls" aria-label="Project carousel controls">
          <button type="button" className="carousel-control" onClick={() => { setPaused(true); setManualPlay(false); goTo(activeIndex - 1); }} aria-label="Previous project">
            <span aria-hidden="true">←</span>
          </button>
          <button
            type="button"
            className="carousel-control carousel-play"
            onClick={() => {
              if (autoplay) {
                setPaused(true);
                setManualPlay(false);
              } else {
                setPaused(false);
                setManualPlay(true);
              }
            }}
            aria-label={reducedMotion ? "Autoplay disabled by reduced-motion preference" : autoplay ? "Pause project carousel" : "Play project carousel"}
            aria-pressed={!reducedMotion && !autoplay}
            disabled={reducedMotion}
          >
            <span aria-hidden="true">{autoplay ? "Ⅱ" : "▶"}</span>
            <span>{reducedMotion ? "Motion off" : autoplay ? "Pause" : "Play"}</span>
          </button>
          <button type="button" className="carousel-control" onClick={() => { setPaused(true); setManualPlay(false); goTo(activeIndex + 1); }} aria-label="Next project">
            <span aria-hidden="true">→</span>
          </button>
          <p className="carousel-hint">Swipe, scroll, or use arrow keys</p>
        </div>
      </div>
    </section>
  );
}

export function PortfolioSection() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    const elements = document.querySelectorAll<HTMLElement>("[data-reveal]");
    elements.forEach((element) => element.classList.add("reveal-ready"));
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      }),
      { threshold: 0.12, rootMargin: "0px 0px -36px 0px" },
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <section className="wrap portfolio-intro" id="work" aria-labelledby="home-title">
        <div className="hero">
          <div className="hero-copy" data-reveal>
            <span className="kicker"><span className="rule" /> ArtHQ / Digital studio</span>
            <h1 id="home-title">Websites &amp; apps,<br /><em>built for what’s next<span>.</span></em></h1>
            <p>
              ArtHQ designs and builds websites, apps, and digital products. We’re a subsidiary of{" "}
              <a href="https://rafalwebcraft.online/" target="_blank" rel="noreferrer">RafalW3bCraft</a>.
            </p>
            <div className="hero-actions">
              <a className="button" href="/auth?mode=new">Start a project <span aria-hidden="true">↗</span></a>
              <a className="quiet-link" href="/auth">Client sign in <span aria-hidden="true">→</span></a>
            </div>
          </div>
          <div className="studio-visual" role="img" aria-label="ArtHQ digital studio: strategy, design, and engineering">
            <div className="visual-grid" aria-hidden="true" />
            <span className="visual-index">AHQ / 01</span>
            <p className="visual-title">Digital<br />made useful.</p>
            <div className="visual-bottom">
              <span>Strategy</span><i aria-hidden="true" />
              <span>Design</span><i aria-hidden="true" />
              <span>Engineering</span>
            </div>
            <span className="visual-orbit" aria-hidden="true"><b>AH</b></span>
          </div>
        </div>
      </section>

      <WorkCarousel />

      <section className="services-section" id="services" aria-labelledby="services-title">
        <div className="wrap">
          <header className="section-heading" data-reveal>
            <div>
              <span className="kicker"><span className="rule" /> What we build</span>
              <h2 id="services-title">From first idea<br />to useful product<span>.</span></h2>
            </div>
            <p>Bring us a clear brief or an early idea. ArtHQ helps turn it into a considered digital experience.</p>
          </header>
          <div className="service-grid">
            {services.map((service) => (
              <article className="service-item" data-reveal key={service.number}>
                <span className="service-number">{service.number}</span>
                <h3>{service.title}</h3>
                <p>{service.description}</p>
                <a className="service-link" href="/auth?mode=new" aria-label={`Start a ${service.title.toLowerCase()} project`}>
                  Start a brief <span aria-hidden="true">↗</span>
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="process-section" aria-labelledby="process-title">
        <div className="wrap">
          <header className="section-heading process-heading" data-reveal>
            <div>
              <span className="kicker"><span className="rule" /> Working together</span>
              <h2 id="process-title">A clear path<br />from brief to build<span>.</span></h2>
            </div>
            <p>Keep the work moving with a shared brief, visible project updates, and a direct support channel.</p>
          </header>
          <ol className="workflow-list">
            {workflow.map((step) => (
              <li data-reveal key={step.number}>
                <span>{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </li>
            ))}
          </ol>
          <a className="button process-cta" href="/auth?mode=new">Tell us what you’re building <span aria-hidden="true">↗</span></a>
        </div>
      </section>
    </>
  );
}
