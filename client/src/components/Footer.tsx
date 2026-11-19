import { Wordmark } from "./Header";
export function Footer() {
  return (
    <footer>
      <div className="wrap foot-inner">
        <Wordmark />
        <p>
          A subsidiary of{" "}
          <a href="https://rafalwebcraft.online/">RafalW3bCraft</a>.
        </p>
        <nav aria-label="Support contacts" className="footer-support">
          <a href="mailto:support@arthq.tech">support@arthq.tech</a>
          <a href="mailto:info@rafalwebcraft.online">
            info@rafalwebcraft.online
          </a>
        </nav>
        <span>© {new Date().getFullYear()} ArtHQ</span>
      </div>
    </footer>
  );
}
