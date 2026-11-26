"use client";

import { Inbox, Loader2, Search, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

export const date = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});

export const money = (paise: number) => currency.format(paise / 100);
/** Inline placeholder for a stat value that is still loading (valid inside <p>/<strong>). */
export function StatLoading({ className }: { className?: string }) {
  return <span role="status" aria-label="Loading" className={`inline-block h-[0.85em] w-14 animate-pulse rounded-md bg-[#e3ecdc] align-middle ${className ?? ""}`} />;
}

export const when = (value?: string | null) => value ? date.format(new Date(value)) : "—";

const names: Record<string, string> = {
  ORDER_PLACED: "Order placed",
  PICKUP_SCHEDULED: "Pickup scheduled",
  PICKED_UP: "Picked up",
  RECEIVED_AT_LAUNDRY: "Received at laundry",
  RECEIVED: "Received at laundry",
  WASHING: "Washing",
  DRYING: "Drying",
  IRONING: "Ironing",
  QUALITY_CHECK: "Quality check",
  READY_FOR_DELIVERY: "Ready for delivery",
  READY: "Ready for delivery",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  PER_KG: "Per kilogram",
  PER_ITEM: "Per item",
  KG: "Per kilogram",
  ITEM: "Per item",
  FIXED: "Fixed price",
  PERCENT: "Percentage",
  COD: "Cash on delivery",
  RAZORPAY: "Razorpay",
};

export function label(value: string) {
  return names[value] ?? value.toLowerCase().replaceAll("_", " ").replace(/^./, (character) => character.toUpperCase());
}

/** Shared Tailwind class sets for the operations dashboard. */
export const ui = {
  button: cn(buttonVariants(), "h-9 rounded-lg px-3.5 text-sm font-semibold hover:bg-[#176a2f]"),
  secondary: cn(buttonVariants({ variant: "outline" }), "h-9 rounded-lg border-border bg-white px-3.5 text-sm font-semibold text-primary hover:bg-accent hover:text-primary"),
  icon: cn(buttonVariants({ variant: "outline" }), "size-9 rounded-lg border-border bg-white p-0 text-primary hover:bg-accent hover:text-primary"),
  alert: "mb-4 flex items-center gap-2 rounded-xl bg-[#ecf6ee] px-4 py-3 text-sm text-[#176a2f] ring-1 ring-[#cfe8d6] break-words",
  alertError: "mb-4 flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200 break-words",
  stack: "grid gap-5 [&_h3]:mb-2 [&_h3]:text-[0.95rem] [&_h3]:font-bold [&_h3]:text-foreground",
  actions: "flex flex-wrap items-center gap-2",
  toolbar: "flex flex-wrap items-center gap-2 px-5 pb-4 [&_select]:h-9 [&_select]:rounded-lg [&_select]:border [&_select]:border-input [&_select]:bg-white [&_select]:px-3 [&_select]:text-sm",
  lineList: "divide-y divide-border text-sm [&>li]:flex [&>li]:items-center [&>li]:justify-between [&>li]:gap-3 [&>li]:py-2.5",
  detail: "grid grid-cols-1 gap-x-5 gap-y-3 sm:grid-cols-2 [&_dt]:text-xs [&_dt]:font-medium [&_dt]:tracking-wide [&_dt]:text-muted-foreground [&_dt]:uppercase [&_dd]:mt-0.5 [&_dd]:text-[0.9rem] [&_dd]:font-semibold [&_dd]:break-words",
  wide: "sm:col-span-2",
  formHeading: "mt-2 text-base font-bold text-foreground sm:col-span-2",
  checks: "flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-foreground sm:col-span-2 [&_label]:inline-flex [&_label]:items-center [&_label]:gap-2 [&_input]:size-4 [&_input]:accent-primary",
  sectionHeading: "flex items-center justify-between gap-3",
  message: "m-0 whitespace-pre-wrap break-words text-sm leading-relaxed",
};

const tones = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  gold: "bg-amber-50 text-amber-800 ring-amber-200",
  gray: "bg-stone-100 text-stone-600 ring-stone-200",
  blue: "bg-[#ecf6ee] text-primary ring-[#cfe8d6]",
};

export function Badge({ value }: { value: string }) {
  const tone = ["DELIVERED", "PAID", "ACTIVE", "CAPTURED", "RESOLVED"].includes(value) ? "green"
    : ["CANCELLED", "FAILED", "INACTIVE", "REFUNDED"].includes(value) ? "gray"
    : ["PENDING", "ORDER_PLACED", "PICKUP_SCHEDULED", "REFUND_PENDING", "OPEN"].includes(value) ? "gold" : "blue";
  return (
    <span className={cn("inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ring-1 ring-inset", tones[tone])}>
      {label(value)}
    </span>
  );
}

export function Empty({ message, title = "Nothing to show yet" }: { message: string; title?: string }) {
  return (
    <div className="grid min-h-40 place-items-center content-center gap-1.5 px-5 py-8 text-center">
      <span className="mb-1 grid size-11 place-items-center rounded-xl bg-[#ecf6ee] text-primary">
        <Inbox className="size-5" aria-hidden="true" />
      </span>
      <strong className="text-sm font-bold text-foreground">{title}</strong>
      <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

export function SearchField({ value, setValue, placeholder }: { value: string; setValue: (value: string) => void; placeholder: string }) {
  return (
    <label className="flex h-9 w-full max-w-xs items-center gap-2 rounded-lg border border-input bg-white px-3 text-muted-foreground focus-within:border-primary focus-within:ring-3 focus-within:ring-primary/15">
      <Search className="size-4 shrink-0" aria-hidden="true" />
      <input
        type="search"
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="h-full w-full min-w-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
      />
    </label>
  );
}

export function Panel({ title, description, action, children }: { title: string; description?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-border bg-white shadow-[0_1px_3px_#1d211e0a]">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div>
          <h2 className="text-base font-bold tracking-[-0.01em] text-foreground">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/* Native inputs inside a Field get consistent shadcn-like styling. */
const control = [
  "[&_input:not([type=checkbox])]:h-10 [&_input:not([type=checkbox])]:w-full [&_input:not([type=checkbox])]:rounded-lg [&_input:not([type=checkbox])]:border [&_input:not([type=checkbox])]:border-input [&_input:not([type=checkbox])]:bg-white [&_input:not([type=checkbox])]:px-3",
  "[&_select]:h-10 [&_select]:w-full [&_select]:rounded-lg [&_select]:border [&_select]:border-input [&_select]:bg-white [&_select]:px-3",
  "[&_textarea]:min-h-20 [&_textarea]:w-full [&_textarea]:resize-y [&_textarea]:rounded-lg [&_textarea]:border [&_textarea]:border-input [&_textarea]:bg-white [&_textarea]:px-3 [&_textarea]:py-2",
  "[&_:is(input,select,textarea)]:text-sm [&_:is(input,select,textarea)]:font-normal [&_:is(input,select,textarea)]:text-foreground",
  "[&_:is(input,select,textarea):focus]:border-primary [&_:is(input,select,textarea):focus]:ring-3 [&_:is(input,select,textarea):focus]:ring-primary/15 [&_:is(input,select,textarea):focus]:outline-none",
  "[&_input[type=checkbox]]:size-4 [&_input[type=checkbox]]:accent-primary",
].join(" ");

export function Field({ label: title, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <label className={cn("grid min-w-0 gap-1.5 text-sm font-semibold text-foreground", control, wide && "sm:col-span-2")}>
      <span>{title}</span>
      {children}
    </label>
  );
}

export function Modal({ title, close, children }: { title: string; close: () => void; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      aria-label={title}
      onCancel={(event) => { event.preventDefault(); close(); }}
      className="m-auto max-h-[88svh] w-[min(680px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-border bg-white p-0 text-foreground shadow-[0_30px_80px_#0f241755] backdrop:bg-[#0f2417]/60 backdrop:backdrop-blur-sm"
    >
      <header className="flex items-center justify-between gap-3 border-b border-border bg-white px-5 py-4">
        <h2 className="text-lg font-bold tracking-[-0.01em]">{title}</h2>
        <button type="button" className={ui.icon} onClick={close} aria-label="Close"><X className="size-5" /></button>
      </header>
      <div className="max-h-[calc(88svh-70px)] overflow-y-auto px-5 py-5">{children}</div>
    </dialog>
  );
}

export function ActionForm({ children, submit, button, full }: {
  children?: ReactNode;
  submit: (form: FormData) => Promise<void>;
  button: string;
  full?: boolean;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  return (
    <form
      className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2 [&>p]:sm:col-span-2", full && "px-5 pb-5")}
      onSubmit={async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        if (saving) return;
        setSaving(true);
        setError("");
        try {
          await submit(form);
        } catch (error) {
          setError(error instanceof Error ? error.message : "The change could not be saved.");
        } finally {
          setSaving(false);
        }
      }}
    >
      {children}
      {error && <p className={ui.alertError} role="alert">{error}</p>}
      <footer className="mt-1 flex justify-end gap-2 sm:col-span-2">
        <button className={ui.button} type="submit" disabled={saving}>
          {saving && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {saving ? "Saving…" : button}
        </button>
      </footer>
    </form>
  );
}

const tableStyles = [
  "w-full border-collapse text-left text-sm",
  "[&_td]:border-t [&_td]:border-border [&_td]:px-4 [&_td]:py-3 [&_td]:align-middle [&_td:first-child]:pl-5 [&_td:last-child]:pr-5 [&_td:last-child]:text-right [&_td:last-child]:whitespace-nowrap",
  "[&_td_strong]:block [&_td_strong]:font-semibold [&_td_strong]:text-foreground [&_td_small]:text-xs [&_td_small]:text-muted-foreground [&_td_form]:inline",
  "[&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-[#f7fbf8]",
].join(" ");

export function Table({ headers, children }: { headers: string[]; children: ReactNode }) {
  return (
    <div className="w-full overflow-x-auto" tabIndex={0} role="region" aria-label="Scrollable table">
      <table className={tableStyles}>
        <thead>
          <tr>
            {headers.map((heading) => (
              <th scope="col" key={heading} className="border-t border-border bg-[#f7fbf8] px-4 py-2.5 text-xs font-semibold tracking-wide whitespace-nowrap text-muted-foreground uppercase first:pl-5 last:pr-5 last:text-right">
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

/** A compact row of summary numbers shown above a directory table. */
export function StatRow({ items }: { items: { label: string; value: number | string }[] }) {
  return (
    <dl className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {items.map(({ label: name, value }) => (
        <div key={name} className="rounded-2xl border border-border bg-white px-4 py-3.5 shadow-[0_1px_3px_#1d211e0a]">
          <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{name}</dt>
          <dd className="mt-1 text-2xl font-extrabold tracking-[-0.03em] text-foreground">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
