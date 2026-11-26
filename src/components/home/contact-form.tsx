"use client";

import { CheckCircle2, Loader2, Send } from "lucide-react";
import { useState, type FormEvent } from "react";
import { friendlyError, post } from "@/components/customer/http";
import { Alert } from "@/components/customer/ui";

const labelClass = "grid min-w-0 gap-1 text-sm font-semibold text-foreground sm:gap-1.5";
const inputClass = "h-11 w-full min-w-0 rounded-xl border border-input bg-white px-3.5 text-base font-normal text-foreground transition-colors placeholder:text-muted-foreground/75 focus:border-primary focus:outline-none focus:ring-3 focus:ring-primary/15";

/** Public "Contact us" form. Messages land in the dashboard under Support → Website enquiries. */
export function ContactForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    setBusy(true);
    setError("");
    try {
      await post("/api/contact", Object.fromEntries(new FormData(form)));
      form.reset();
      setSent(true);
    } catch (caught) {
      setError(friendlyError(caught));
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="grid justify-items-start gap-3 rounded-2xl bg-[#ecf6ee] p-6" role="status">
        <CheckCircle2 className="size-8 text-primary" aria-hidden="true" />
        <p className="text-lg font-bold text-foreground">Thanks, your message is on its way.</p>
        <p className="text-sm leading-relaxed text-muted-foreground">We’ll reply by email or phone as soon as we can, usually within a few hours during opening hours.</p>
        <button type="button" className="text-sm font-semibold text-primary hover:underline" onClick={() => setSent(false)}>Send another message</button>
      </div>
    );
  }

  return (
    <form className="relative grid gap-3 sm:gap-4" onSubmit={submit}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        <label className={labelClass}>Your name<input className={inputClass} name="name" required maxLength={80} autoComplete="name" placeholder="Full name" /></label>
        <label className={labelClass}><span>Phone <span className="font-normal text-muted-foreground">(optional)</span></span><input className={inputClass} name="phone" type="tel" maxLength={25} autoComplete="tel" placeholder="+91 98765 43210" /></label>
      </div>
      <label className={labelClass}>Email<input className={inputClass} name="email" type="email" required maxLength={254} autoComplete="email" placeholder="you@example.com" /></label>
      <label className={labelClass}>How can we help?<textarea className="min-h-24 w-full min-w-0 resize-y rounded-xl border border-input bg-white px-3.5 py-2.5 text-base font-normal text-foreground transition-colors placeholder:text-muted-foreground/75 focus:border-primary focus:outline-none focus:ring-3 focus:ring-primary/15 sm:min-h-28 sm:py-3" rows={3} name="message" required minLength={10} maxLength={2000} placeholder="Tell us about your pickup, garment or booking…" /></label>
      {/* Hidden from people; bots that fill it are ignored. */}
      <label className="sr-only" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
      {error && <Alert>{error}</Alert>}
      <button type="submit" disabled={busy} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 text-base font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60">
        {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Send className="size-4" aria-hidden="true" />}
        {busy ? "Sending…" : "Send message"}
      </button>
      <p className="text-xs leading-relaxed text-muted-foreground">We only use your details to reply to this message. See our <a href="/privacy" className="underline underline-offset-2">Privacy Policy</a>.</p>
    </form>
  );
}
