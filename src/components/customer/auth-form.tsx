"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { ArrowLeft, CalendarDays, CircleAlert, Eye, EyeOff, Loader2, MailCheck, Package, Settings2, ShieldCheck, Sparkles, Truck, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { friendlyError, post } from "@/components/customer/http";
import type { User } from "@/components/customer/data";

export type AuthMode = "login" | "admin" | "register" | "forgot" | "reset" | "verify";
type AuthResult = { user?: User | null; message?: string; loginPath?: string };

const copy = {
  login: { title: "Welcome back", lead: "Log in to book a pickup and follow your orders.", submit: "Log in" },
  register: { title: "Create your account", lead: "Save your addresses and book your next pickup in minutes.", submit: "Create account" },
  forgot: { title: "Reset your password", lead: "Enter your account email and we’ll send you a reset link.", submit: "Send reset link" },
  reset: { title: "Set a new password", lead: "Choose a password with at least eight characters.", submit: "Update password" },
  admin: { title: "Team sign in", lead: "For administrators, staff and riders. You will see the sections your administrator has given you.", submit: "Sign in to dashboard" },
  verify: { title: "Verify your email", lead: "Confirm this email address to start booking.", submit: "Confirm email address" },
};

const oauthErrors: Record<string, string> = {
  google_unavailable: "Google sign-in isn’t set up yet. Please use your email and password.",
  google_cancelled: "Google sign-in was cancelled. You can try again or use your email.",
  google_failed: "We couldn’t sign you in with Google. Please try again.",
  account_disabled: "This account is not active. Please contact support.",
};

function safeDestination(value: string | null) {
  if (value === "/book" || value === "/admin" || value === "/account") return value;
  if (!value?.startsWith("/account?")) return undefined;
  const query = new URLSearchParams(value.slice("/account?".length));
  const order = query.get("order");
  const tab = query.get("tab");
  if (order && /^[a-zA-Z0-9_-]{1,100}$/.test(order)) return `/account?order=${order}`;
  if (tab && ["addresses", "profile", "payments", "offers", "updates", "support"].includes(tab)) return `/account?tab=${tab}`;
  return undefined;
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.27c0-.82-.07-1.6-.2-2.36H12v4.47h6.45a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.57-5.17 3.57-8.73Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.88-3.01c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.95H1.27v3.11A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.27 14.29A7.2 7.2 0 0 1 4.9 12c0-.8.14-1.57.37-2.29V6.6H1.27A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.4l4-3.11Z" />
      <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44A11.5 11.5 0 0 0 12 0 12 12 0 0 0 1.27 6.6l4 3.11C6.22 6.88 8.87 4.77 12 4.77Z" />
    </svg>
  );
}

function Alert({ children, tone = "error" }: { children: ReactNode; tone?: "error" | "success" }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm leading-relaxed",
        tone === "error" ? "bg-red-50 text-red-800 ring-1 ring-red-200" : "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200",
      )}
    >
      {tone === "error" ? <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> : <MailCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />}
      <span>{children}</span>
    </p>
  );
}

function Field({ label, htmlFor, children, action }: { label: string; htmlFor: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={htmlFor} className="text-sm font-semibold text-foreground">{label}</Label>
        {action}
      </div>
      {children}
    </div>
  );
}

const inputClass = "h-12 rounded-xl border-input bg-white px-4 text-base shadow-none focus-visible:border-primary focus-visible:ring-primary/20 md:text-base";

function PasswordInput({ name, autoComplete, minLength }: { name: string; autoComplete: string; minLength?: number }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input
        required
        id={`auth-${name}`}
        name={name}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        minLength={minLength}
        maxLength={128}
        className={cn(inputClass, "pr-12")}
      />
      <button
        type="button"
        onClick={() => setVisible(!visible)}
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute top-1/2 right-2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        {visible ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
      </button>
    </div>
  );
}

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const search = useSearchParams();
  const token = search.get("token");
  const destination = safeDestination(search.get("next"));
  const destinationQuery = destination ? `?next=${encodeURIComponent(destination)}` : "";
  const oauthError = oauthErrors[search.get("error") ?? ""];
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const team = mode === "admin" || search.get("portal") === "team";
  const [loginPath, setLoginPath] = useState(team ? "/admin/login" : "/login");
  const teamQuery = team ? "?portal=team" : "";
  const text = copy[mode];
  const hasEmail = ["login", "admin", "register", "forgot"].includes(mode);
  const hasPassword = ["login", "admin", "register", "reset"].includes(mode);
  const invalidLink = ["verify", "reset"].includes(mode) && !token;
  const showGoogle = mode === "login" || mode === "register";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    if (mode === "reset" && fields.password !== fields.confirmPassword) {
      setError("The two passwords need to match.");
      setBusy(false);
      return;
    }
    try {
      const result = await post<AuthResult>("/api/auth", {
        action: mode === "admin" ? "login" : mode,
        portal: mode === "admin" ? "admin" : "customer",
        name: fields.name,
        email: fields.email,
        password: fields.password,
        ...(token ? { token } : {}),
      });
      if (mode === "login" || mode === "admin" || (mode === "register" && result.user?.verified)) {
        const defaultDestination = result.user?.role && result.user.role !== "CUSTOMER" ? "/admin" : "/account";
        router.replace(result.user?.role && result.user.role !== "CUSTOMER" ? "/admin" : destination && destination !== "/admin" ? destination : defaultDestination);
        router.refresh();
        return;
      }
      if (result.loginPath === "/login" || result.loginPath === "/admin/login") setLoginPath(result.loginPath);
      setNotice(result.message ?? (
        mode === "register" ? "Check your email to verify your new account." :
        mode === "forgot" ? "If the address belongs to an account, a reset link will be sent." :
        mode === "reset" ? "Your password has been updated. Log in with your new password." :
        "Your email is verified. You can now log in."
      ));
    } catch (caught) {
      setError(friendlyError(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-[calc(100vh-80px)] bg-[#f5fcf7]">
      <div className="container grid min-h-[calc(100vh-80px)] items-center gap-10 py-10 lg:grid-cols-2 lg:gap-14 lg:py-14">
        {/* Form card */}
        <section className="mx-auto w-full max-w-[460px] rounded-3xl border border-border bg-white p-6 shadow-[0_24px_60px_#1f2a2212] sm:p-9">
          {["forgot", "reset", "verify"].includes(mode) && (
            <Link href={loginPath} className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-primary">
              <ArrowLeft className="size-4" aria-hidden="true" /> Back to login
            </Link>
          )}

          <header>
            <h1 className="text-[1.9rem] leading-tight font-extrabold tracking-[-0.04em] text-foreground sm:text-[2.1rem]">{text.title}</h1>
            <p className="mt-2 text-[0.95rem] leading-relaxed text-muted-foreground">{text.lead}</p>
          </header>

          <div className="mt-7 grid gap-5">
            {oauthError && <Alert>{oauthError}</Alert>}
            {error && <Alert>{error}</Alert>}
            {invalidLink && <Alert>This link is missing its confirmation token. Open the link from your email.</Alert>}

            {notice ? (
              <div className="grid gap-4">
                <Alert tone="success">{notice}</Alert>
                {mode === "reset" && <Link href={loginPath} className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-white hover:bg-primary/90">Go to sign in</Link>}
              </div>
            ) : !invalidLink && (
              <>
                {showGoogle && (
                  <>
                    <a
                      href={`/api/auth/google${destinationQuery}`}
                      className="flex h-12 items-center justify-center gap-3 rounded-xl border border-input bg-white text-[0.95rem] font-semibold text-foreground shadow-[0_2px_6px_#1f2a220a] transition-colors hover:border-primary/40 hover:bg-[#f5fcf7]"
                    >
                      <GoogleIcon />
                      {mode === "register" ? "Sign up with Google" : "Continue with Google"}
                    </a>
                    <div className="flex items-center gap-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      <span className="h-px flex-1 bg-border" /> or use your email <span className="h-px flex-1 bg-border" />
                    </div>
                  </>
                )}

                <form className="grid gap-4" onSubmit={submit}>
                  {mode === "register" && (
                    <Field label="Full name" htmlFor="auth-name">
                      <Input required id="auth-name" name="name" autoComplete="name" maxLength={80} placeholder="Your name" className={inputClass} />
                    </Field>
                  )}
                  {hasEmail && (
                    <Field label="Email address" htmlFor="auth-email">
                      <Input required id="auth-email" type="email" name="email" autoComplete="email" maxLength={254} placeholder="you@example.com" className={inputClass} />
                    </Field>
                  )}
                  {hasPassword && (
                    <Field
                      label={mode === "reset" ? "New password" : "Password"}
                      htmlFor="auth-password"
                      action={(mode === "login" || mode === "admin") && (
                        <Link href={`/forgot-password${teamQuery}`} className="text-sm font-semibold text-primary hover:underline">Forgot password?</Link>
                      )}
                    >
                      <PasswordInput name="password" autoComplete={mode === "login" || mode === "admin" ? "current-password" : "new-password"} minLength={mode === "login" || mode === "admin" ? undefined : 8} />
                    </Field>
                  )}
                  {mode === "reset" && (
                    <Field label="Confirm password" htmlFor="auth-confirmPassword">
                      <PasswordInput name="confirmPassword" autoComplete="new-password" minLength={8} />
                    </Field>
                  )}
                  {mode === "register" && <p className="text-xs text-muted-foreground">Use at least 8 characters for your password.</p>}

                  <Button
                    type="submit"
                    disabled={busy}
                    className="mt-1 h-12 rounded-xl text-base font-semibold shadow-[0_12px_26px_#1e7f3a40] hover:bg-[#176a2f]"
                  >
                    {busy && <Loader2 className="animate-spin" aria-hidden="true" />}
                    {busy ? "Please wait…" : text.submit}
                  </Button>
                </form>
              </>
            )}

            {mode === "verify" && invalidLink && <ResendForm />}
          </div>

          <footer className="mt-7 border-t border-border pt-5 text-center text-sm text-muted-foreground">
            {mode === "admin" && <>Are you a customer? <Link className="font-semibold text-primary hover:underline" href="/login">Customer login</Link></>}
            {mode === "login" && <>New here? <Link className="font-semibold text-primary hover:underline" href={`/register${destinationQuery}`}>Create an account</Link></>}
            {mode === "register" && <>Already have an account? <Link className="font-semibold text-primary hover:underline" href={`/login${destinationQuery}`}>Log in</Link></>}
            {mode === "register" && (
              <p className="mt-3 text-xs">
                By creating an account you agree to our <Link href="/terms" className="underline hover:text-primary">Terms</Link> and <Link href="/privacy" className="underline hover:text-primary">Privacy policy</Link>.
              </p>
            )}
            {mode === "reset" && invalidLink && <Link className="font-semibold text-primary hover:underline" href={`/forgot-password${teamQuery}`}>Request a new reset link</Link>}
            {["forgot", "verify"].includes(mode) && <>Need help? <Link className="font-semibold text-primary hover:underline" href="/#contact">Contact us</Link></>}
          </footer>
        </section>

        {/* Side panel: photo for customers, dashboard summary for the admin */}
        <aside className="relative hidden h-full max-h-[680px] min-h-[560px] overflow-hidden rounded-[2rem] shadow-[0_24px_60px_#1f2a2229] lg:block">
          {mode === "admin"
            ? <div className="absolute inset-0 bg-linear-to-br from-[#1e7f3a] via-[#165f2b] to-[#0f2417]">
                <div className="absolute -top-24 -right-24 size-80 rounded-full bg-white/10 blur-2xl" />
                <ShieldCheck className="absolute top-10 left-10 size-14 text-white/90" aria-hidden="true" />
              </div>
            : <>
                <Image src="/images/hero-basket.webp" alt="" fill sizes="50vw" className="object-cover object-[center_60%]" />
                <div className="absolute inset-0 bg-linear-to-t from-[#1f2a22]/85 via-[#1f2a22]/20 to-transparent" />
              </>}
          <div className="absolute inset-x-0 bottom-0 p-10 text-white">
            <p className="text-3xl leading-tight font-extrabold tracking-[-0.03em]">
              {mode === "admin" ? <>Operations<br />dashboard.</> : <>Fresh laundry,<br />more time for you.</>}
            </p>
            <ul className="mt-6 grid gap-3 text-[0.95rem] font-medium text-white/90">
              {(mode === "admin" ? [
                { icon: Package, label: "Manage orders from pickup to delivery" },
                { icon: UsersRound, label: "View and manage every customer" },
                { icon: Settings2, label: "Update services, prices and settings" },
              ] : [
                { icon: Truck, label: "Doorstep pickup & delivery" },
                { icon: CalendarDays, label: "Choose a slot that suits you" },
                { icon: Sparkles, label: "Track every step of your order" },
              ]).map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-full bg-white/15 backdrop-blur-sm"><Icon className="size-[18px]" aria-hidden="true" /></span>
                  {label}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
}

function ResendForm() {
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function resend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setFeedback("");
    setBusy(true);
    const email = new FormData(event.currentTarget).get("email");
    try {
      const result = await post<AuthResult>("/api/auth", { action: "resend", email });
      setFeedback(result.message ?? "If a verification email is available for this address, it will be sent.");
    } catch (caught) {
      setError(friendlyError(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="grid gap-4" onSubmit={resend}>
      {error && <Alert>{error}</Alert>}
      {feedback && <Alert tone="success">{feedback}</Alert>}
      <Field label="Email address" htmlFor="resend-email">
        <Input id="resend-email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" className={inputClass} />
      </Field>
      <Button type="submit" disabled={busy} className="h-12 rounded-xl text-base font-semibold hover:bg-[#176a2f]">
        {busy ? "Sending…" : "Resend verification email"}
      </Button>
    </form>
  );
}
