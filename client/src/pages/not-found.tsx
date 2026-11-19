export default function NotFound() {
  return (
    <section className="wrap portal">
      <span className="kicker">404</span>
      <h1>Page not found.</h1>
      <p>This address doesn’t lead to an ArtHQ page.</p>
      <a className="button" href="/">
        Return to the portfolio
      </a>
    </section>
  );
}
