import { useState, type FormEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";

export default function AuthPage({
  completing = false,
}: {
  completing?: boolean;
}) {
  const { signUp, signIn, completeProfile, currentUser, signOut } = useAuth();
  const [register, setRegister] = useState(
    new URLSearchParams(location.search).get("mode") === "new",
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function handleSignOut() {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      await signOut();
    } catch {
      setError("We couldn’t sign you out. Please try again.");
    } finally {
      setPending(false);
    }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    const field = (key: string) => String(data.get(key) || "").trim();
    const password = String(data.get("password") || "");
    const details = {
      companyName: field("company"),
      phoneNumber: field("phone"),
    };
    if (register && !completing && password !== data.get("confirm")) {
      setError("The passwords must match.");
      return;
    }
    setPending(true);
    setError("");
    try {
      if (completing && currentUser)
        await completeProfile(currentUser, details);
      else if (register) await signUp(field("email"), password, details);
      else await signIn(field("email"), password);
    } catch (reason) {
      const code = (reason as { code?: string }).code;
      setError(
        code === "auth/email-already-in-use"
          ? "This email already has an account. Sign in to continue."
          : [
                "auth/invalid-credential",
                "auth/invalid-login-credentials",
                "auth/wrong-password",
                "auth/user-not-found",
              ].includes(code || "")
            ? "Check your email and password and try again."
            : "We couldn’t complete your request. Check your details and connection, then try again.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="wrap portal auth">
      <div className="panel stack">
        <span className="kicker">Client portal</span>
        <h1>
          {completing
            ? "Complete your profile"
            : register
              ? "Create an account"
              : "Client sign in"}
        </h1>
        <form
          onSubmit={submit}
          className="stack"
          key={String(register) + String(completing)}
        >
          {!completing && (
            <label>
              Email
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                maxLength={254}
              />
            </label>
          )}
          {(register || completing) && (
            <>
              <label>
                Company or name
                <input
                  name="company"
                  required
                  maxLength={120}
                  autoComplete="organization"
                />
              </label>
              <label>
                Phone number
                <input
                  name="phone"
                  type="tel"
                  required
                  maxLength={40}
                  autoComplete="tel"
                />
              </label>
            </>
          )}
          {!completing && (
            <label>
              Password
              <input
                name="password"
                type="password"
                required
                minLength={register ? 6 : 1}
                autoComplete={register ? "new-password" : "current-password"}
              />
            </label>
          )}
          {register && !completing && (
            <label>
              Confirm password
              <input
                name="confirm"
                type="password"
                required
                autoComplete="new-password"
              />
            </label>
          )}
          {error && (
            <p id="auth-error" role="alert" className="notice">
              {error}
            </p>
          )}
          <button className="button" disabled={pending}>
            {pending
              ? "Saving…"
              : completing
                ? "Save profile"
                : register
                  ? "Create account"
                  : "Sign in"}
          </button>
        </form>
        {completing ? (
          <button className="link-button" onClick={() => void handleSignOut()} disabled={pending}>
            {pending ? "Signing out…" : "Sign out"}
          </button>
        ) : (
          <button
            className="link-button"
            onClick={() => {
              setRegister(!register);
              setError("");
            }}
          >
            {register
              ? "Already registered? Sign in"
              : "New to ArtHQ? Create an account"}
          </button>
        )}
      </div>
    </section>
  );
}
