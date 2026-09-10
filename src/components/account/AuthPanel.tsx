import { useEffect, useState, type FormEvent } from "react";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { BrandMark } from "@/components/upvero/BrandMark";
import { isStrongPassword, safeRequestedDestination } from "@/lib/auth-security";

type AuthMode = "sign-in" | "sign-up" | "forgot-password" | "reset-password";

function requestedDestination(): string {
  if (typeof window === "undefined") return "/dashboard";
  return safeRequestedDestination(window.location.search);
}

export function AuthPanel() {
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [signedInEmail, setSignedInEmail] = useState<string | null>(null);

  useEffect(() => {
    const client = createBrowserSupabaseClient();
    if (new URLSearchParams(window.location.search).get("mode") === "reset-password") {
      setMode("reset-password");
    }
    void client.auth.getUser().then(({ data }) => setSignedInEmail(data.user?.email ?? null));
    const { data: listener } = client.auth.onAuthStateChange((event, session) => {
      setSignedInEmail(session?.user.email ?? null);
      if (event === "PASSWORD_RECOVERY") setMode("reset-password");
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const client = createBrowserSupabaseClient();

    if (mode === "forgot-password") {
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/account?mode=reset-password&next=${encodeURIComponent(requestedDestination())}`,
      });
      setBusy(false);
      setMessage(
        error
          ? error.message
          : "If an account exists for that email, a secure password-reset link is on its way.",
      );
      return;
    }

    if (mode === "reset-password") {
      if (password !== passwordConfirmation) {
        setBusy(false);
        setMessage("The passwords do not match.");
        return;
      }
      if (!isStrongPassword(password)) {
        setBusy(false);
        setMessage(
          "Use at least 12 characters with an uppercase letter, lowercase letter, number, and symbol.",
        );
        return;
      }
      const { error } = await client.auth.updateUser({ password });
      setBusy(false);
      if (error) {
        setMessage(error.message);
        return;
      }
      window.history.replaceState(
        {},
        "",
        `/account?next=${encodeURIComponent(requestedDestination())}`,
      );
      setPassword("");
      setPasswordConfirmation("");
      setMode("sign-in");
      setMessage("Your password has been updated securely.");
      return;
    }

    if (mode === "sign-up" && !isStrongPassword(password)) {
      setBusy(false);
      setMessage(
        "Use at least 12 characters with an uppercase letter, lowercase letter, number, and symbol.",
      );
      return;
    }

    const result =
      mode === "sign-in"
        ? await client.auth.signInWithPassword({ email, password })
        : await client.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/account?next=${encodeURIComponent(requestedDestination())}`,
            },
          });
    setBusy(false);
    if (result.error) {
      setMessage(result.error.message);
      return;
    }
    if (mode === "sign-in") {
      window.location.assign(requestedDestination());
      return;
    }
    setMessage("Account created. Check your email if confirmation is enabled, then sign in.");
  }

  async function signOut() {
    setBusy(true);
    const { error } = await createBrowserSupabaseClient().auth.signOut();
    setBusy(false);
    setMessage(error ? error.message : "You are signed out.");
  }

  return (
    <main className="uv-app">
      <section className="uv-auth-shell">
        <BrandMark />
        <div className="uv-auth-card">
          <p className="uv-eyebrow">Upvero account</p>
          <h1>
            {mode === "reset-password"
              ? "Choose a new password"
              : signedInEmail
                ? "Your account"
                : mode === "forgot-password"
                  ? "Reset your password"
                  : mode === "sign-in"
                    ? "Sign in"
                    : "Create your account"}
          </h1>
          {signedInEmail && mode !== "reset-password" ? (
            <div className="uv-auth-content">
              <p>Signed in as {signedInEmail}.</p>
              <a href={requestedDestination()} className="uv-button uv-button-primary">
                Open your dashboard
              </a>
              <button
                type="button"
                disabled={busy}
                onClick={signOut}
                className="uv-button uv-button-secondary"
              >
                Sign out
              </button>
            </div>
          ) : (
            <form className="uv-auth-form" onSubmit={submit}>
              {mode !== "reset-password" && (
                <label>
                  Email
                  <input
                    className="uv-input"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </label>
              )}
              {mode !== "forgot-password" && (
                <label>
                  {mode === "reset-password" ? "New password" : "Password"}
                  <input
                    className="uv-input"
                    type="password"
                    autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                    minLength={mode === "sign-in" ? 1 : 12}
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                  {mode !== "sign-in" && (
                    <small>
                      At least 12 characters with uppercase, lowercase, a number, and a symbol.
                    </small>
                  )}
                </label>
              )}
              {mode === "reset-password" && (
                <label>
                  Confirm new password
                  <input
                    className="uv-input"
                    type="password"
                    autoComplete="new-password"
                    minLength={12}
                    required
                    value={passwordConfirmation}
                    onChange={(event) => setPasswordConfirmation(event.target.value)}
                  />
                </label>
              )}
              <button disabled={busy} className="uv-button uv-button-primary">
                {busy
                  ? "Please wait…"
                  : mode === "sign-in"
                    ? "Sign in"
                    : mode === "sign-up"
                      ? "Create account"
                      : mode === "forgot-password"
                        ? "Send secure reset link"
                        : "Update password"}
              </button>
            </form>
          )}
          {message && (
            <p className="uv-notice" role="status">
              {message}
            </p>
          )}
          {!signedInEmail && mode !== "reset-password" && (
            <div className="uv-auth-content">
              <button
                type="button"
                className="uv-auth-toggle"
                onClick={() => {
                  setMode((current) => (current === "sign-in" ? "sign-up" : "sign-in"));
                  setMessage("");
                }}
              >
                {mode === "sign-in"
                  ? "Need an account? Sign up"
                  : "Already have an account? Sign in"}
              </button>
              {mode === "sign-in" && (
                <button
                  type="button"
                  className="uv-auth-toggle"
                  onClick={() => {
                    setMode("forgot-password");
                    setMessage("");
                  }}
                >
                  Forgot your password?
                </button>
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
