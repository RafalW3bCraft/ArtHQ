import {
  ArrowUpRight,
  Check,
  FileText,
  MessageCircle,
  Play,
  Send,
  Volume2,
} from "lucide-react";
export function WebsitePreview() {
  return (
    <div
      className="website-preview"
      aria-label="Illustrative website design concept"
    >
      <div className="preview-browser">
        <div>
          <i />
          <i />
          <i />
        </div>
        <span>A little inspiration for your next website</span>
        <ArrowUpRight size={12} />
      </div>
      <div className="concept-site">
        <div className="concept-nav">
          <strong>
            form<span> & </span>field
          </strong>
          <span>Spaces &nbsp; Our story &nbsp; ↗</span>
        </div>
        <div className="concept-body">
          <div>
            <span className="concept-eyebrow">
              THOUGHTFULLY MADE. SIMPLY LIVED.
            </span>
            <h3>
              A little space.
              <br />A lot of <em>possibility.</em>
            </h3>
            <p>Beautiful spaces for everyday life.</p>
            <span className="concept-button">Find your space ↗</span>
          </div>
          <div className="architectural-scene">
            <div className="scene-sun" />
            <div className="scene-arch">
              <div />
            </div>
            <div className="scene-floor" />
            <div className="scene-plant">
              <i />
              <i />
              <i />
              <b />
            </div>
            <div className="scene-chair" />
          </div>
        </div>
        <div className="concept-bottom">
          <span>DESIGNED AROUND YOU</span>
          <span>01 — 03</span>
        </div>
      </div>
      <span className="concept-caption">
        Website design concept · not a client project
      </span>
    </div>
  );
}
export function projectVisualType(category: string) {
  if (/bot|automation/i.test(category)) return 1;
  if (/custom ai|document/i.test(category)) return 2;
  return 0;
}
export function ProjectPreview({
  type,
  image,
  title,
}: {
  type: number;
  image?: string;
  title: string;
}) {
  if (image)
    return (
      <div className="project-visual">
        <img src={image} alt={title} loading="lazy" />
      </div>
    );
  return (
    <div
      className={`project-visual visual-${type % 3}`}
      aria-label={`Concept illustration for ${title}`}
    >
      {type % 3 === 0 && (
        <div className="language-preview">
          <span className="preview-label">A LITTLE PRACTICE, EVERY DAY</span>
          <h4>
            Hello.
            <br />
            <span>مرحبا · A new beginning.</span>
          </h4>
          <div className="language-wave">
            {Array.from({ length: 24 }, (_, i) => (
              <i key={i} style={{ height: `${14 + ((i * 17) % 43)}px` }} />
            ))}
          </div>
          <div className="lesson-row">
            <span>
              <Volume2 size={15} /> Your next conversation starts here
            </span>
            <Play size={17} />
          </div>
        </div>
      )}
      {type % 3 === 1 && (
        <div className="bot-preview">
          <div className="bot-avatar">
            <MessageCircle size={25} />
          </div>
          <div className="chat-bubble light">Can we make this automatic?</div>
          <div className="chat-bubble purple">
            Absolutely. Let’s simplify your day. <Check size={14} />
          </div>
          <div className="bot-input">
            One less task on your list.
            <Send size={15} />
          </div>
        </div>
      )}
      {type % 3 === 2 && (
        <div className="docs-preview">
          <div className="doc-icons">
            <FileText />
            <FileText />
            <FileText />
          </div>
          <div className="search-preview">
            Ask your documents anything <ArrowUpRight size={15} />
          </div>
          <div className="answer-preview">
            <span className="answer-dot" /> Answers you can trace.
            <div />
            <div />
            <small>Sources included ↗</small>
          </div>
        </div>
      )}
      <span className="preview-caption">Concept illustration</span>
    </div>
  );
}
