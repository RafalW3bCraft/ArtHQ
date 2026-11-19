import { useState } from "react";
import { Redirect } from "wouter";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AuthPage from "./AuthPage";
import DashboardPage from "./DashboardPage";
import AdminPage from "./AdminPage";

function Workspace({ path }: { path: string }) {
  const session = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    setSignOutError("");
    try {
      await session.signOut();
    } catch {
      setSignOutError("We couldn’t sign you out. Please try again.");
    } finally {
      setSigningOut(false);
    }
  }
  if (session.loading)
    return (
      <p className="wrap loading" role="status">
        Loading your workspace…
      </p>
    );
  if (session.error)
    return (
      <section className="wrap portal">
        <h1>Connection interrupted</h1>
        <p>
          We couldn’t load your account. Check your connection and try again.
        </p>
        <button className="button" onClick={() => location.reload()}>
          Try again
        </button>
      </section>
    );
  if (!session.currentUser)
    return path === "/auth" ? <AuthPage /> : <Redirect to="/auth" replace />;
  if (!session.userProfile) return <AuthPage completing />;
  if (path === "/auth") return <Redirect to="/dashboard" replace />;
  if (path === "/admin" && session.userProfile.role !== "admin")
    return (
      <section className="wrap portal">
        <h1>Admin access required</h1>
        <a href="/dashboard" className="button">
          Open client portal
        </a>
      </section>
    );
  return (
    <section className="wrap portal" key={session.currentUser.uid}>
      <div className="portal-top">
        <span className="kicker">
          <span className="rule" />{" "}
          {path === "/admin" ? "Admin workspace" : "Client portal"}
        </span>
        <div className="inline">
          {session.userProfile.role === "admin" && (
            <a href={path === "/admin" ? "/dashboard" : "/admin"}>
              {path === "/admin" ? "Client portal" : "Admin workspace"}
            </a>
          )}
          <button
            className="link-button"
            onClick={() => void signOut()}
            disabled={signingOut}
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </div>
      {signOutError && <p className="notice" role="alert">{signOutError}</p>}
      {path === "/admin" ? <AdminPage /> : <DashboardPage />}
    </section>
  );
}
export default function ConnectedPortal({ path }: { path: string }) {
  return (
    <AuthProvider>
      <Workspace path={path} />
    </AuthProvider>
  );
}
