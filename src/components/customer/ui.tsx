import Link from "next/link";
import type { ReactNode } from "react";
import { Check, CircleAlert, Loader2, Package, type LucideIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Shared Tailwind styles for customer-facing pages (account, booking, services). */
export const btn = {
  primary: cn(buttonVariants(), "h-10 rounded-full px-5 font-semibold hover:bg-primary/90"),
  cta: cn(buttonVariants(), "h-10 rounded-full bg-(--cta) px-5 font-semibold text-white hover:bg-(--cta-hover)"),
  outline: cn(buttonVariants({ variant: "outline" }), "h-10 rounded-full border-border bg-white px-5 font-semibold text-foreground hover:border-primary/40 hover:bg-muted hover:text-primary"),
  icon: cn(buttonVariants({ variant: "outline" }), "size-9 rounded-full border-border bg-white p-0 text-primary hover:bg-secondary hover:text-primary"),
  link: "inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline disabled:opacity-50",
};

export const card = "rounded-3xl border border-border bg-white p-5 shadow-[0_1px_3px_#1d211e0a] sm:p-6";

/** Wrap a <label> around an input/select/textarea to get consistent field styling. */
export const fieldClass = [
  "grid gap-1.5 text-sm font-semibold text-foreground",
  "[&_:is(input,select,textarea)]:w-full [&_:is(input,select,textarea)]:rounded-xl [&_:is(input,select,textarea)]:border [&_:is(input,select,textarea)]:border-input [&_:is(input,select,textarea)]:bg-white [&_:is(input,select,textarea)]:px-3.5 [&_:is(input,select,textarea)]:text-base [&_:is(input,select,textarea)]:font-normal",
  "[&_:is(input,select)]:h-11 [&_textarea]:min-h-28 [&_textarea]:py-2.5",
  "[&_:is(input,select,textarea):focus]:border-primary [&_:is(input,select,textarea):focus]:ring-3 [&_:is(input,select,textarea):focus]:ring-primary/15 [&_:is(input,select,textarea):focus]:outline-none",
  "[&_:is(input,select,textarea):disabled]:opacity-60 [&_input[readonly]]:bg-muted [&_input[readonly]]:text-muted-foreground",
].join(" ");

export function Optional() {
  return <span className="font-normal text-muted-foreground">(optional)</span>;
}

export function Alert({ children, tone = "error" }: { children: ReactNode; tone?: "error" | "success" | "info" }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2.5 rounded-2xl px-4 py-3 text-sm leading-relaxed ring-1",
        tone === "error" && "bg-red-50 text-red-800 ring-red-200",
        tone === "success" && "bg-emerald-50 text-emerald-900 ring-emerald-200",
        tone === "info" && "bg-amber-50 text-amber-900 ring-amber-200",
      )}
    >
      {tone === "success" ? <Check className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> : <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />}
      <span>{children}</span>
    </p>
  );
}

export function Empty({ icon: Icon = Package, title, message, href, linkText }: { icon?: LucideIcon; title: string; message: string; href?: string; linkText?: string }) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-border bg-white px-6 py-12 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-secondary text-primary"><Icon className="size-6" aria-hidden="true" /></span>
      <h2 className="mt-4 text-lg font-bold text-foreground">{title}</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{message}</p>
      {href && linkText && <Link className={cn(btn.cta, "mt-5")} href={href}>{linkText}</Link>}
    </div>
  );
}

export function Spinner({ message = "Loading…", className }: { message?: string; className?: string }) {
  return (
    <div className={cn("grid min-h-60 place-items-center text-muted-foreground", className)} role="status">
      <span className="inline-flex items-center gap-2"><Loader2 className="size-5 animate-spin text-primary" /> {message}</span>
    </div>
  );
}
