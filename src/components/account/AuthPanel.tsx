import { useEffect, useState, type FormEvent } from "react";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";

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
    <main className="min-h-screen bg-sand/40 px-6 py-12 text-ink sm:px-10">
      <section className="mx-auto max-w-md rounded-2xl bg-bone p-6 shadow-sm ring-1 ring-ink/10 sm:p-8">
        <p className="text-sm font-semibold tracking-wide text-clay">UpVero account</p>
        <h1 className="mt-2 font-display text-3xl font-medium tracking-tight">
          {signedInEmail ? "Your account" : mode === "sign-in" ? "Sign in" : "Create your account"}
        </h1>
        {signedInEmail ? (
          <div className="mt-5">
            <p className="text-sm leading-relaxed text-ink/70">Signed in as {signedInEmail}.</p>
            <button
              type="button"
              disabled={busy}
              onClick={signOut}
              className="mt-5 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-bone disabled:opacity-60"
            >
              Sign out
            </button>
          </div>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={submit}>
            <label className="block text-sm font-medium">
              Email
              <input
                className="mt-1 w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label className="block text-sm font-medium">
              Password
              <input
                className="mt-1 w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm"
                type="password"
                autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                minLength={8}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <button
              disabled={busy}
              className="w-full rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-bone disabled:opacity-60"
            >
              {busy ? "Please wait…" : mode === "sign-in" ? "Sign in" : "Create account"}
            </button>
          </form>
        )}
        {message && (
          <p className="mt-4 text-sm text-ink/70" role="status">
            {message}
          </p>
        )}
        {!signedInEmail && (
          <button
            type="button"
            className="mt-5 text-sm font-medium text-clay underline"
            onClick={() => {
              setMode((current) => (current === "sign-in" ? "sign-up" : "sign-in"));
              setMessage("");
            }}
          >
            {mode === "sign-in" ? "Need an account? Sign up" : "Already have an account? Sign in"}
          </button>
        )}
      </section>
    </main>
  );
}
