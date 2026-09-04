import { useEffect, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { BrandMark } from "@/components/upvero/BrandMark";

type AuthMode = "sign-in" | "sign-up";

export function AuthPanel() {
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [signedInEmail, setSignedInEmail] = useState<string | null>(null);

  useEffect(() => {
    const client = createBrowserSupabaseClient();
    void client.auth.getUser().then(({ data }) => setSignedInEmail(data.user?.email ?? null));
    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      setSignedInEmail(session?.user.email ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const client = createBrowserSupabaseClient();
    const result =
      mode === "sign-in"
        ? await client.auth.signInWithPassword({ email, password })
        : await client.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: `${window.location.origin}/account` },
          });
    setBusy(false);
    if (result.error) {
      setMessage(result.error.message);
      return;
    }
    setMessage(
      mode === "sign-up"
        ? "Account created. Check your email if confirmation is enabled, then sign in."
        : "You are signed in.",
    );
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
            {signedInEmail
              ? "Your account"
              : mode === "sign-in"
                ? "Sign in"
                : "Create your account"}
          </h1>
          {signedInEmail ? (
            <div className="uv-auth-content">
              <p>Signed in as {signedInEmail}.</p>
              <Link to="/dashboard" className="uv-button uv-button-primary">
                Open your dashboard
              </Link>
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
              <label>
                Password
                <input
                  className="uv-input"
                  type="password"
                  autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                  minLength={8}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>
              <button disabled={busy} className="uv-button uv-button-primary">
                {busy ? "Please wait…" : mode === "sign-in" ? "Sign in" : "Create account"}
              </button>
            </form>
          )}
          {message && (
            <p className="uv-notice" role="status">
              {message}
            </p>
          )}
          {!signedInEmail && (
            <button
              type="button"
              className="uv-auth-toggle"
              onClick={() => {
                setMode((current) => (current === "sign-in" ? "sign-up" : "sign-in"));
                setMessage("");
              }}
            >
              {mode === "sign-in" ? "Need an account? Sign up" : "Already have an account? Sign in"}
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
