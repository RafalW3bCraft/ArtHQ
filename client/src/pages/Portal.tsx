import { lazy, Suspense } from "react";
import { backendConfigured, serviceUnavailable } from "@/lib/config";

const Connected = lazy(() => import("./ConnectedPortal"));
export default function Portal({ path }: { path: string }) {
  if (!backendConfigured)
    return (
      <section className="wrap portal">
        <span className="kicker">Client portal</span>
        <h1>Client services</h1>
        <p role="status">{serviceUnavailable}</p>
        <a className="outline-button" href="/">
          View the portfolio
        </a>
      </section>
    );
  return (
    <Suspense
      fallback={
        <p className="wrap loading" role="status">
          Connecting to the client portal…
        </p>
      }
    >
      <Connected path={path} />
    </Suspense>
  );
}
