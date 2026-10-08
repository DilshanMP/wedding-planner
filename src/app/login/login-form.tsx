"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MailCheck } from "lucide-react";
import { z } from "zod";
import { cloudEnabled, getSupabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/store/provider";
import { TextField } from "@/components/ui/fields";
import { LotusMark, Notice } from "@/components/ui/primitives";

export function LoginForm() {
  const auth = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (auth.mode === "cloud" && auth.status === "signed_in") router.replace("/dashboard");
  }, [auth, router]);

  const submit = async () => {
    const parsed = z.email("Enter a valid email address.").safeParse(email.trim());
    if (!parsed.success) return setError(parsed.error.issues[0].message);
    setBusy(true);
    setError(null);
    const { error: e } = await getSupabase().auth.signInWithOtp({ email: parsed.data, options: { emailRedirectTo: `${window.location.origin}/dashboard` } });
    setBusy(false);
    if (e) setError("We couldn't send the link. Check the address and try again.");
    else setSent(true);
  };

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="wos-card wos-card--hero flex w-full max-w-[440px] flex-col gap-5">
        <LotusMark className="size-12 text-champagne-700" />
        <h1 className="wos-h1">Welcome back</h1>
        {!cloudEnabled ? (
          <>
            <p className="m-0 text-ink-muted">This copy of Wedding OS keeps your plan in this browser, so there&apos;s no account to sign in to.</p>
            <Link href="/dashboard" className="wos-btn wos-btn--primary">Open Your Wedding</Link>
          </>
        ) : sent ? (
          <Notice tone="success" icon={<MailCheck className="wos-icon" />} title={`Check ${email} for your sign-in link.`}>It works once, on this device, for the next hour.</Notice>
        ) : (
          <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); void submit(); }} noValidate>
            <p className="m-0 text-ink-muted">We&apos;ll email you a secure sign-in link. No password needed.</p>
            <TextField label="Email" type="email" autoComplete="email" value={email} onChange={setEmail} error={error ?? undefined} autoFocus />
            <button type="submit" className="wos-btn wos-btn--primary" disabled={busy}>{busy ? "Sending…" : "Email Me a Link"}</button>
          </form>
        )}
      </div>
    </div>
  );
}
