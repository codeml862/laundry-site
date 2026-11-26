"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, CreditCard, LoaderCircle, MapPin, MessageSquare, Pencil, Phone, Plus, RefreshCw, ShoppingCart, Star, UserRound } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { ActionForm, Badge, Field, money, ui, when } from "@/components/dashboard/ui";
import { read, shortId, type Address, type Mutate } from "@/components/dashboard/types";
import type { CustomerDetail, CustomerRecord } from "./types";

export function CustomerAvatar({ name, large = false }: { name: string; large?: boolean }) {
  return <span aria-hidden="true" className={`grid shrink-0 place-items-center rounded-full bg-[#edf5d9] font-extrabold text-[#287b16] ${large ? "size-16 text-2xl" : "size-10 text-sm"}`}>{name.trim().split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase() || <UserRound className="size-5" />}</span>;
}

function AddressForm({ customer, address, mutate, onSaved }: { customer: CustomerRecord; address: Partial<Address>; mutate: Mutate; onSaved: () => Promise<void> }) {
  return <ActionForm button="Save address" submit={async (form) => {
    await mutate("customerAddress", { userId: customer.id, id: address.id, label: read(form, "label"), phone: read(form, "phone"), line1: read(form, "line1"), line2: read(form, "line2"), city: read(form, "city"), postalCode: read(form, "postalCode") }, "Customer address saved.");
    await onSaved();
  }}>
    <Field label="Address label"><input name="label" required maxLength={45} defaultValue={address.label || "Home"} /></Field>
    <Field label="Phone"><input name="phone" type="tel" required maxLength={25} defaultValue={address.phone || customer.phone || ""} /></Field>
    <Field label="Street address" wide><input name="line1" required maxLength={120} defaultValue={address.line1} /></Field>
    <Field label="Address line 2" wide><input name="line2" maxLength={120} defaultValue={address.line2 || ""} /></Field>
    <Field label="City"><input name="city" required maxLength={70} defaultValue={address.city} /></Field>
    <Field label="PIN code"><input name="postalCode" required pattern="[0-9]{6}" inputMode="numeric" maxLength={6} defaultValue={address.postalCode} /></Field>
  </ActionForm>;
}

export function CustomerDrawer({ id, close, mutate, onChanged, onOpenOrder }: { id: string; close: () => void; mutate: Mutate; onChanged: () => void; onOpenOrder: (id: string) => void }) {
  const [data, setData] = useState<CustomerDetail | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [address, setAddress] = useState<Partial<Address> | null>(null);
  const [showAll, setShowAll] = useState(false);
  const requestNumber = useRef(0);

  async function reload() {
    const sequence = ++requestNumber.current;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/customers?id=${encodeURIComponent(id)}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load customer details.");
      if (sequence === requestNumber.current) setData(result);
    } catch (cause) {
      if (sequence === requestNumber.current) setError(cause instanceof Error ? cause.message : "Could not load customer details.");
    } finally { if (sequence === requestNumber.current) setLoading(false); }
  }

  useEffect(() => {
    void reload();
    return () => { ++requestNumber.current; };
    // This drawer is keyed by the selected customer; reload is also used after saves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const customer = data?.customer;
  const phone = customer?.phone?.replace(/[^\d+]/g, "") || "";
  async function saved() { setEditing(false); setAddress(null); onChanged(); await reload(); }

  return <Sheet open onOpenChange={(open) => { if (!open) close(); }}>
    <SheetContent side="right" className="w-full gap-0 overflow-y-auto border-[#e1e9d8] p-0 sm:max-w-[480px]">
      <header className="sticky top-0 z-10 border-b border-[#e9eddf] bg-white/95 px-6 py-5 pr-12 backdrop-blur"><SheetTitle className="text-xl font-extrabold tracking-tight text-[#14350e]">Customer Details</SheetTitle><SheetDescription className="sr-only">Customer profile, order activity and saved addresses</SheetDescription></header>
      {loading && !customer && <p role="status" className="flex items-center justify-center gap-2 p-8 text-muted-foreground"><LoaderCircle className="size-5 animate-spin" /> Loading customer…</p>}
      {error && <div className="p-6"><p role="alert" className={ui.alertError}>{error}</p><button type="button" className={ui.secondary} onClick={() => void reload()}>Try again</button></div>}
      {customer && <div className="grid gap-6 p-6">
        <div className="flex items-start gap-3"><CustomerAvatar name={customer.name} large /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="break-words text-lg font-extrabold text-[#182c12]">{customer.name}</h3><Badge value={customer.active ? "ACTIVE" : "INACTIVE"} /></div><p className="mt-1 break-all text-sm text-muted-foreground">{customer.email}</p><p className="mt-1 text-sm">{customer.phone || "No phone saved"}</p></div></div>
        <dl className="grid gap-3 text-sm"><div className="flex items-start gap-3"><MapPin className="size-4 shrink-0 text-[#318015]" aria-hidden="true" /><dt className="sr-only">Area</dt><dd>{[...new Set(customer.addresses.map((item) => item.city))].join(", ") || "No address saved"}</dd></div><div className="flex items-center gap-3"><CalendarDays className="size-4 text-[#318015]" aria-hidden="true" /><dt>Joined:</dt><dd>{when(customer.createdAt)}</dd></div><div className="flex items-center gap-3"><Star className="size-4 text-[#318015]" aria-hidden="true" /><dt>Customer Type:</dt><dd>{customer.orderCount > 1 ? "Repeat" : customer.orderCount ? "First-time" : "No orders yet"}</dd></div></dl>
        <div className="grid grid-cols-3 divide-x divide-[#dce5d0] rounded-2xl border border-[#e8eddf] bg-[#fcfdf9] py-4">{[{ icon: ShoppingCart, title: "Orders", value: customer.orderCount.toLocaleString("en-IN") }, { icon: CreditCard, title: "Total Spent", value: money(customer.totalSpent) }, { icon: RefreshCw, title: "Avg. Order", value: money(customer.orderCount ? Math.round(customer.totalSpent / customer.orderCount) : 0) }].map(({ icon: Icon, title, value }) => <p key={title} className="grid min-w-0 justify-items-center gap-1 px-2 text-center"><Icon className="size-6 text-[#2d7c14]" aria-hidden="true" /><strong className="max-w-full break-words text-base font-extrabold">{value}</strong><span className="text-xs text-muted-foreground">{title}</span></p>)}</div>
        <section><div className="mb-3 flex items-center justify-between gap-2"><h3 className="font-extrabold text-[#14350e]">Recent Orders</h3>{data.orders.length > 3 && <button type="button" className="text-sm font-semibold text-[#287b16]" onClick={() => setShowAll((shown) => !shown)}>{showAll ? "Show less" : "View history"}</button>}</div>{data.orders.length ? <ul className="divide-y divide-[#edf0e5]">{data.orders.slice(0, showAll ? 20 : 3).map((order) => <li key={order.id}><button type="button" className="flex w-full flex-wrap items-center justify-between gap-2 rounded-lg py-3 text-left hover:bg-secondary" onClick={() => { close(); onOpenOrder(order.id); }}><span className="text-xs font-bold text-[#277914]">{shortId(order.id)}</span><span className="min-w-0 flex-1 truncate text-sm">{order.items.map((item) => item.name).join(", ")}</span><strong className="text-sm">{money(order.total)}</strong><Badge value={order.status} /></button></li>)}</ul> : <p className="rounded-xl bg-[#f5f8ef] p-4 text-sm text-muted-foreground">This customer hasn’t placed an order yet.</p>}{showAll && customer.orderCount > data.historyLimit && <p className="mt-2 text-xs text-muted-foreground">Showing the latest {data.historyLimit} orders. Search the Orders screen for older bookings.</p>}</section>
        <section className="border-t border-[#e9eddf] pt-5"><div className="mb-3 flex items-center justify-between"><h3 className="font-extrabold text-[#14350e]">Profile</h3><button type="button" className="inline-flex items-center gap-1 text-sm font-semibold text-primary" onClick={() => setEditing((open) => !open)}><Pencil className="size-3.5" />{editing ? "Close editor" : "Edit profile"}</button></div>{editing && <ActionForm button="Save profile" submit={async (form) => { await mutate("customer", { id: customer.id, name: read(form, "name"), phone: read(form, "phone") }, "Customer profile saved."); await saved(); }}><Field label="Name"><input name="name" required maxLength={80} defaultValue={customer.name} /></Field><Field label="Phone"><input name="phone" type="tel" maxLength={25} defaultValue={customer.phone || ""} /></Field></ActionForm>}</section>
        <section className="border-t border-[#e9eddf] pt-5"><div className="mb-3 flex items-center justify-between gap-2"><h3 className="font-extrabold text-[#14350e]">Saved Addresses</h3><button type="button" className="inline-flex items-center gap-1 text-sm font-semibold text-primary" onClick={() => setAddress(address ? null : {})}><Plus className="size-4" />{address ? "Close editor" : "Add address"}</button></div><ul className="grid gap-3">{customer.addresses.map((item, index) => <li key={item.id || index} className="flex items-start justify-between gap-3 rounded-xl border border-[#e4ebdc] p-3 text-sm"><span><strong>{item.label}</strong><span className="mt-1 block text-muted-foreground">{[item.line1, item.line2, item.city, item.postalCode].filter(Boolean).join(", ")}</span></span><button type="button" aria-label={`Edit ${item.label || "saved"} address`} className="grid size-8 shrink-0 place-items-center rounded-lg text-primary hover:bg-secondary" onClick={() => setAddress(item)}><Pencil className="size-4" /></button></li>)}</ul>{!customer.addresses.length && !address && <p className="text-sm text-muted-foreground">No saved addresses. Add one to book a pickup.</p>}{address && <div className="mt-4"><AddressForm key={address.id || "new"} customer={customer} address={address} mutate={mutate} onSaved={saved} /></div>}</section>
        <div className="grid gap-3 border-t border-[#e9eddf] pt-5 sm:grid-cols-2">{phone ? <a href={`tel:${phone}`} className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[#2b7e16] px-4 text-sm font-semibold text-[#22630f]"><Phone className="size-4" />Call Customer</a> : <span className="inline-flex h-11 items-center justify-center rounded-full border border-border px-4 text-sm text-muted-foreground">No phone available</span>}<a href={`mailto:${encodeURIComponent(customer.email)}`} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#ff7900] px-4 text-sm font-semibold text-white hover:bg-[#e56d00]"><MessageSquare className="size-4" />Send Message</a></div>
        <p className="text-xs text-muted-foreground">Total spent includes collected payments. “Send Message” opens your email app.</p>
      </div>}
    </SheetContent>
  </Sheet>;
}
