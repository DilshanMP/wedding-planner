"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MailCheck } from "lucide-react";
import { z } from "zod";
import type { AuthError } from "@supabase/supabase-js";
import { cloudEnabled, getSupabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/store/provider";
import { TextField } from "@/components/ui/fields";
import { LotusMark, Notice } from "@/components/ui/primitives";

type Method = "password" | "link";
type PasswordMode = "sign_in" | "sign_up";

const MIN_PASSWORD = 8;

/** Turns Supabase Auth errors into something a couple can act on. */
export function authMessage(e: AuthError, fallback: string): string {
  const msg = e.message.toLowerCase();
  if (e.status === 429 || msg.includes("rate limit")) return "Too many emails were sent in the last hour. Wait a while, or sign in with a password instead.";
  if (msg.includes("invalid login credentials")) return "That email and password don't match. Check them, or create an account first.";
  if (msg.includes("email not confirmed")) return "Confirm your email first — open the link we sent you, then sign in.";
  if (msg.includes("already registered")) return "There's already an account for this email. Sign in instead.";
  if (msg.includes("password")) return e.message;
  return fallback;
}

export function LoginForm() {
  const auth = useAuth();
  const router = useRouter();
  const [method, setMethod] = useState<Method>("password");
  const [mode, setMode] = useState<PasswordMode>("sign_in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (auth.mode === "cloud" && auth.status === "signed_in") router.replace("/dashboard");
  }, [auth, router]);

  const validEmail = (): string | null => {
    const parsed = z.email("Enter a valid email address.").safeParse(email.trim());
    setEmailError(parsed.success ? null : parsed.error.issues[0].message);
    return parsed.success ? parsed.data : null;
  };

  const sendLink = async () => {
    const address = validEmail();
    if (!address) return;
    setBusy(true);
    setError(null);
    const { error: e } = await getSupabase().auth.signInWithOtp({ email: address, options: { emailRedirectTo: `${window.location.origin}/dashboard` } });
    setBusy(false);
    if (e) setError(authMessage(e, "We couldn't send the link. Check the address and try again."));
    else setSent(`Check ${address} for your sign-in link.`);
  };

  const submitPassword = async () => {
    const address = validEmail();
    if (!address) return;
    if (password.length < MIN_PASSWORD) return setError(`Use at least ${MIN_PASSWORD} characters for the password.`);
    setBusy(true);
    setError(null);
    const supabase = getSupabase();
    if (mode === "sign_in") {
      const { error: e } = await supabase.auth.signInWithPassword({ email: address, password });
      setBusy(false);
      if (e) setError(authMessage(e, "We couldn't sign you in. Try again."));
      return;
    }
    const { data, error: e } = await supabase.auth.signUp({ email: address, password, options: { emailRedirectTo: `${window.location.origin}/dashboard` } });
    setBusy(false);
    if (e) return setError(authMessage(e, "We couldn't create the account. Try again."));
    // With email confirmation off, sign-up returns a session and the provider takes over.
    if (!data.session) setSent(`Check ${address} to confirm your account, then sign in.`);
  };

  const switchMethod = (m: Method) => {
    setMethod(m);
    setError(null);
    setEmailError(null);
  };

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="wos-card wos-card--hero flex w-full max-w-[440px] flex-col gap-5">
        <LotusMark className="size-12 text-champagne-700" />
        <h1 className="wos-h1">{method === "password" && mode === "sign_up" ? "Create your account" : "Welcome back"}</h1>
        {!cloudEnabled ? (
          <>
            <p className="m-0 text-ink-muted">This copy of Wedding OS keeps your plan in this browser, so there&apos;s no account to sign in to.</p>
            <Link href="/dashboard" className="wos-btn wos-btn--primary">Open Your Wedding</Link>
          </>
        ) : sent ? (
          <>
            <Notice tone="success" icon={<MailCheck className="wos-icon" />} title={sent}>Can&apos;t find it? Look in Spam or Promotions.</Notice>
            <button type="button" className="wos-btn wos-btn--ghost" onClick={() => setSent(null)}>Back</button>
          </>
        ) : (
          <>
            <div className="wos-tabs" role="tablist" aria-label="Sign-in method">
              <button type="button" role="tab" className="wos-tab" aria-selected={method === "password"} onClick={() => switchMethod("password")}>Password</button>
              <button type="button" role="tab" className="wos-tab" aria-selected={method === "link"} onClick={() => switchMethod("link")}>Email link</button>
            </div>
            {method === "password" ? (
              <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); void submitPassword(); }} noValidate>
                <TextField label="Email" type="email" autoComplete="email" value={email} onChange={setEmail} error={emailError ?? undefined} autoFocus />
                <TextField
                  label="Password"
                  type="password"
                  autoComplete={mode === "sign_in" ? "current-password" : "new-password"}
                  value={password}
                  onChange={setPassword}
                  help={mode === "sign_up" ? `At least ${MIN_PASSWORD} characters.` : undefined}
                  error={error ?? undefined}
                />
                <button type="submit" className="wos-btn wos-btn--primary" disabled={busy}>
                  {busy ? "Please wait…" : mode === "sign_in" ? "Sign In" : "Create Account"}
                </button>
                <button type="button" className="wos-btn wos-btn--ghost" onClick={() => { setMode(mode === "sign_in" ? "sign_up" : "sign_in"); setError(null); }}>
                  {mode === "sign_in" ? "New here? Create an account" : "Already have an account? Sign in"}
                </button>
              </form>
            ) : (
              <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); void sendLink(); }} noValidate>
                <p className="m-0 text-ink-muted">We&apos;ll email you a secure sign-in link. No password needed.</p>
                <TextField label="Email" type="email" autoComplete="email" value={email} onChange={setEmail} error={emailError ?? error ?? undefined} autoFocus />
                <button type="submit" className="wos-btn wos-btn--primary" disabled={busy}>{busy ? "Sending…" : "Email Me a Link"}</button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
