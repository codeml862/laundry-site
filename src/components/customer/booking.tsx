"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { CalendarDays, Check, ChevronDown, CreditCard, Loader2, LogIn, MailCheck, MapPin, Minus, Plus, ShieldCheck, ShoppingBag, Trash2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { AddressForm } from "@/components/customer/address-form";
import { useCart } from "@/components/customer/cart";
import { dateInIndia, maxCartQuantity, unitLabel, type Account, type Address, type Catalog, type Quote, type Service } from "@/components/customer/data";
import { friendlyError, post, rupees } from "@/components/customer/http";
import { openPayment, type PaymentSession } from "@/components/customer/payment";
import { Alert, Empty, Optional, Spinner, btn, card, fieldClass } from "@/components/customer/ui";
import { useData } from "@/components/customer/use-data";

type Method = "COD" | "RAZORPAY";
type Created = { orderId: string; razorpay?: PaymentSession; paymentError?: string };
type QuoteState = { key: string; value?: Quote; error?: string };

const oneDay = 86_400_000;

function slotTime(date: string, slot: string, end = false) {
  const match = (end ? /[–-](\d{2}:\d{2})$/ : /^(\d{2}:\d{2})/).exec(slot)?.[1];
  return Date.parse(`${date}T${match ?? "00:00"}:00+05:30`);
}

function QuantityPicker({ service, value, disabled, onChange }: {
  service: Service;
  value: number;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  const step = service.unit === "KG" ? 0.25 : 1;
  const [editing, setEditing] = useState<{ base: number; draft: string }>();
  const shown = editing?.base === value ? editing.draft : String(value);
  const unit = unitLabel(service.unit);

  return (
    <div className="flex items-center gap-1 rounded-full bg-[#ecf6ee] p-1">
      <button className="grid size-8 place-items-center rounded-full bg-white text-primary shadow-sm hover:bg-primary hover:text-white disabled:opacity-40" type="button" aria-label={`Decrease quantity of ${service.name}`} disabled={disabled || value <= step} onClick={() => onChange(value - step)}><Minus className="size-4" /></button>
      <input className="w-12 bg-transparent text-center text-sm font-bold text-primary outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" type="number" aria-label={`Quantity of ${service.name} in ${unit}`} value={shown} min={step} max={maxCartQuantity} step={step} disabled={disabled}
        onChange={(event) => setEditing({ base: value, draft: event.target.value })}
        onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
        onBlur={(event) => {
          const next = event.currentTarget.valueAsNumber;
          if (Number.isFinite(next) && next >= step && next <= maxCartQuantity && Number.isInteger(next / step) && next !== value) onChange(next);
          setEditing(undefined);
        }} />
      <button className="grid size-8 place-items-center rounded-full bg-white text-primary shadow-sm hover:bg-primary hover:text-white disabled:opacity-40" type="button" aria-label={`Increase quantity of ${service.name}`} disabled={disabled || value + step > maxCartQuantity} onClick={() => onChange(value + step)}><Plus className="size-4" /></button>
    </div>
  );
}

export function Booking() {
  const router = useRouter();
  const cart = useCart();
  const catalog = useData<Catalog>("/api/catalog");
  const account = useData<Account>(cart.user ? "/api/account" : null);
  const [selectedAddress, setSelectedAddress] = useState("");
  const [addedAddress, setAddedAddress] = useState<Address>();
  const [addingAddress, setAddingAddress] = useState(false);
  const [pickupDate, setPickupDate] = useState("");
  const [pickupSlot, setPickupSlot] = useState("");
  const [now, setNow] = useState(Date.now);
  const [method, setMethod] = useState<Method>();
  const [couponDraft, setCouponDraft] = useState("");
  const [coupon, setCoupon] = useState("");
  const [quoteState, setQuoteState] = useState<QuoteState>();
  const [quotingRevision, setQuotingRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [placedOrder, setPlacedOrder] = useState<string>();
  const attempt = useRef<{ payload: string; id: string } | null>(null);

  const serviceMap = useMemo(() => new Map(catalog.data?.services.map((service) => [service.id, service])), [catalog.data]);
  const settings = catalog.data?.settings;
  const validItems = useMemo(() => cart.items.filter((item) => serviceMap.has(item.serviceId)), [cart.items, serviceMap]);
  const quoteBody = JSON.stringify({ action: "quote", items: validItems, ...(coupon ? { coupon } : {}) });

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!catalog.data || !validItems.length) return;
    let active = true;
    post<Quote>("/api/booking", JSON.parse(quoteBody)).then(
      (value) => { if (active) setQuoteState({ key: quoteBody, value }); },
      (caught: unknown) => { if (active) setQuoteState({ key: quoteBody, error: friendlyError(caught) }); },
    );
    return () => { active = false; };
  }, [catalog.data, quoteBody, quotingRevision, validItems.length]);

  const quote = quoteState?.key === quoteBody ? quoteState.value : undefined;
  const quoteError = quoteState?.key === quoteBody ? quoteState.error : undefined;
  const addresses = account.data?.addresses ?? [];
  const visibleAddresses = addedAddress && !addresses.some(({ id }) => id === addedAddress.id) ? [...addresses, addedAddress] : addresses;
  const addressId = selectedAddress || visibleAddresses[0]?.id || "";
  const selectedMethod = (method === "COD" && settings?.cod) || (method === "RAZORPAY" && settings?.onlinePayments)
    ? method : settings?.cod ? "COD" : settings?.onlinePayments ? "RAZORPAY" : undefined;
  const bookingUnavailable = !settings?.slots.length || !selectedMethod;
  const unavailableItems = cart.items.length - validItems.length;
  const belowMinimum = Boolean(quote && settings && quote.subtotal < settings.minimum);
  const today = dateInIndia(new Date(now));
  const pickupSlots = (settings?.slots ?? []).filter((slot) => pickupDate !== today || !/^\d{2}:\d{2}/.test(slot) || slotTime(pickupDate, slot) > now);
  const longestService = Math.max(0, ...validItems.map(({ serviceId }) => serviceMap.get(serviceId)?.hours ?? 0));
  const earliestDelivery = pickupDate && pickupSlots.includes(pickupSlot)
    ? dateInIndia(new Date(slotTime(pickupDate, pickupSlot, true) + longestService * 3_600_000))
    : pickupDate || today;

  async function book(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !cart.user || !quote || !addressId || !selectedMethod || unavailableItems || belowMinimum) return;
    setBusy(true);
    setOrderError("");
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    if (fields.deliveryDate && !fields.deliverySlot) {
      setOrderError("Choose a delivery time for your preferred delivery date.");
      setBusy(false);
      return;
    }
    if (fields.deliverySlot && !fields.deliveryDate) {
      setOrderError("Choose a delivery date for your preferred delivery time.");
      setBusy(false);
      return;
    }
    const payload = {
      action: "create",
      items: validItems,
      coupon: coupon || undefined,
      addressId,
      pickupDate: fields.pickupDate,
      pickupSlot: fields.pickupSlot,
      deliveryDate: fields.deliveryDate || undefined,
      deliverySlot: fields.deliverySlot || undefined,
      instructions: fields.instructions,
      method: selectedMethod,
      expectedTotal: quote.total,
    };
    const key = JSON.stringify(payload);
    if (attempt.current?.payload !== key) attempt.current = { payload: key, id: crypto.randomUUID() };
    try {
      await cart.settled();
      const result = await post<Created>("/api/booking", { ...payload, requestId: attempt.current.id });
      cart.replace([]);
      setPlacedOrder(result.orderId);
      if (selectedMethod === "RAZORPAY") {
        if (result.paymentError || (!result.razorpay && quote.total > 0)) {
          setOrderError(result.paymentError ?? "Your order was saved. Complete payment from your account.");
          return;
        }
        const verified = !result.razorpay || await openPayment(result.razorpay, result.orderId, cart.user, settings?.businessName);
        if (!verified) {
          setOrderError("Payment was closed. You can resume payment from your account.");
          return;
        }
      }
      router.push(`/account?order=${encodeURIComponent(result.orderId)}`);
    } catch (caught) {
      setOrderError(friendlyError(caught));
      setQuotingRevision((revision) => revision + 1);
    } finally {
      setBusy(false);
    }
  }

  if (catalog.loading || !cart.ready) return <Spinner message="Loading your cart…" />;
  if (catalog.error) {
    return (
      <div className="grid justify-items-start gap-3">
        <Alert>{catalog.error}</Alert>
        <button className={btn.outline} onClick={catalog.refresh}>Try again</button>
      </div>
    );
  }
  if (placedOrder) {
    return (
      <div className="grid gap-4">
        {orderError && <Alert>{orderError}</Alert>}
        <Empty icon={ShieldCheck} title="Your order was saved" message={busy ? "Keep this page open while checkout finishes." : "Open your order to see its current status and payment details."} href={busy ? undefined : `/account?order=${encodeURIComponent(placedOrder)}`} linkText="View order" />
      </div>
    );
  }
  if (!cart.items.length) return <ServicePicker services={catalog.data?.services ?? []} onAdd={(id) => cart.setQuantity(id, 1)} />;

  const canBook = Boolean(cart.user?.verified && cart.user.role === "CUSTOMER");
  const submitDisabled = busy || !quote || !addressId || bookingUnavailable || unavailableItems > 0 || addingAddress || belowMinimum || Boolean(pickupDate && !pickupSlots.length);
  const submitLabel = busy ? "Confirming booking…" : selectedMethod === "RAZORPAY" ? "Continue to payment" : "Confirm booking";
  const slotChosen = Boolean(pickupDate && pickupSlots.includes(pickupSlot));
  const chosenAddress = visibleAddresses.find(({ id }) => id === addressId);
  const steps = [
    { label: "Services", done: validItems.length > 0 && !unavailableItems },
    { label: "Address", done: canBook && Boolean(addressId) },
    { label: "Schedule", done: canBook && slotChosen },
    { label: "Payment", done: canBook && Boolean(selectedMethod) },
  ];
  const itemCount = cart.items.length;

  return (
    <div className="pb-28 lg:pb-0">
      <ol className="mb-6 grid grid-cols-4 gap-2 sm:gap-3" aria-label="Booking progress">
        {steps.map((step, index) => (
          <li key={step.label} className="min-w-0">
            <span className={cn("block h-1.5 rounded-full transition-colors duration-300", step.done ? "bg-primary" : "bg-[#dfe6e1]")} aria-hidden="true" />
            <span className={cn("mt-2 flex items-center gap-1.5 text-xs font-semibold sm:text-sm", step.done ? "text-primary" : "text-muted-foreground")}>
              <span className={cn("hidden size-5 shrink-0 place-items-center rounded-full text-[0.7rem] sm:grid", step.done ? "bg-primary text-white" : "bg-[#eef1ee] text-foreground")} aria-hidden="true">{step.done ? <Check className="size-3" /> : index + 1}</span>
              <span className="truncate">{step.label}</span>
              <span className="sr-only">{step.done ? " (done)" : ""}</span>
            </span>
          </li>
        ))}
      </ol>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="grid min-w-0 grid-cols-1 gap-5">
          <StepCard step={1} title="Your services" icon={ShoppingBag} action={<Link href="/services" className={btn.link}><Plus className="size-4" aria-hidden="true" /> Add more</Link>}>
            <ul className="grid grid-cols-1 gap-3">
              {cart.items.map((item) => {
                const service = serviceMap.get(item.serviceId);
                const lineTotal = service ? rupees(Math.round(service.price * item.quantity)) : "";
                return (
                  <li className="flex gap-3 rounded-2xl border border-border p-3 sm:gap-4 sm:p-4" key={item.serviceId}>
                    <ServiceThumb service={service} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 leading-snug font-semibold break-words text-foreground">{service?.name ?? "Unavailable service"}</p>
                        <button className="-mt-1 -mr-1 grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40" type="button" aria-label={`Remove ${service?.name ?? "unavailable service"}`} disabled={busy} onClick={() => cart.setQuantity(item.serviceId, 0)}><Trash2 className="size-4" /></button>
                      </div>
                      <p className="text-sm text-muted-foreground">{service ? (service.unit === "FIXED" ? `${rupees(service.price)} · fixed price` : `${rupees(service.price)} / ${unitLabel(service.unit)}`) : "Remove this service to continue."}</p>
                      {service && (
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                          {service.unit !== "FIXED" ? <QuantityPicker service={service} value={item.quantity} disabled={busy} onChange={(quantity) => cart.setQuantity(item.serviceId, quantity)} /> : <span className="rounded-full bg-[#ecf6ee] px-3 py-1 text-xs font-semibold text-primary">1 × {service.name.split(" – ").pop()}</span>}
                          <p className="font-bold text-foreground">{lineTotal}</p>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </StepCard>

          {!cart.user ? (
            <section className={cn(card, "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between")}>
              <div className="flex items-start gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#ecf6ee] text-primary"><LogIn className="size-5" aria-hidden="true" /></span>
                <div>
                  <h2 className="text-lg font-bold text-foreground">Sign in to schedule your pickup</h2>
                  <p className="text-sm text-muted-foreground">Your cart is saved and will be waiting after you sign in.</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
                <Link href="/login?next=%2Fbook" className={btn.primary}>Log in</Link>
                <Link href="/register?next=%2Fbook" className={btn.outline}>Sign up</Link>
              </div>
            </section>
          ) : cart.user.role !== "CUSTOMER" ? (
            <section className={cn(card, "flex items-start gap-3")}>
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#ecf6ee] text-primary"><ShieldCheck className="size-5" aria-hidden="true" /></span>
              <div className="grid gap-3">
                <div>
                  <h2 className="text-lg font-bold text-foreground">Use a customer account to book</h2>
                  <p className="text-sm text-muted-foreground">You’re signed in with a team account. Bookings are made by customers — log out and sign in with a customer account to place one.</p>
                </div>
                <div><Link className={btn.outline} href="/admin">Go to dashboard</Link></div>
              </div>
            </section>
          ) : !cart.user.verified ? (
            <section className={cn(card, "flex items-start gap-3")}>
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#ecf6ee] text-primary"><MailCheck className="size-5" aria-hidden="true" /></span>
              <div className="grid gap-3">
                <div>
                  <h2 className="text-lg font-bold text-foreground">Verify your email to book</h2>
                  <p className="text-sm text-muted-foreground">Open the verification link in your inbox to finish setting up your account.</p>
                </div>
                <div><Link className={btn.outline} href="/verify-email">Resend verification email</Link></div>
              </div>
            </section>
          ) : (
            <>
              <StepCard step={2} title="Pickup address" icon={MapPin}>
                {account.loading && <Spinner className="min-h-20" message="Loading saved addresses…" />}
                {account.error && <Alert>{account.error}</Alert>}
                {visibleAddresses.length > 0 && !addingAddress && (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Saved addresses">
                    {visibleAddresses.map((address) => {
                      const chosen = address.id === addressId;
                      return (
                        <label key={address.id} className={cn("flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors", chosen ? "border-primary bg-[#ecf6ee] ring-1 ring-primary/30" : "border-border bg-white hover:border-primary/40")}>
                          <input className="mt-1 size-4 shrink-0 accent-primary" type="radio" name="address" value={address.id} checked={chosen} disabled={busy} onChange={() => setSelectedAddress(address.id)} />
                          <span className="min-w-0 text-sm">
                            <span className="block font-semibold text-foreground">{address.label}</span>
                            <span className="block break-words text-muted-foreground">{address.line1}{address.line2 ? `, ${address.line2}` : ""}</span>
                            <span className="block text-muted-foreground">{address.city} {address.postalCode} · {address.phone}</span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
                {addingAddress ? (
                  <div className="rounded-2xl bg-[#f5f8f6] p-4 sm:p-5">
                    <AddressForm onCancel={() => setAddingAddress(false)} onSaved={(address) => {
                      if (address) { setAddedAddress(address); setSelectedAddress(address.id); }
                      setAddingAddress(false);
                      account.refresh();
                    }} />
                  </div>
                ) : (
                  <button className={cn(btn.outline, "w-full justify-center border-dashed sm:w-auto sm:justify-self-start")} type="button" disabled={busy} onClick={() => setAddingAddress(true)}><Plus aria-hidden="true" /> {visibleAddresses.length ? "Add another address" : "Add your address"}</button>
                )}
              </StepCard>

              <form id="booking-form" className="grid min-w-0 grid-cols-1 gap-5" onSubmit={book}>
                <StepCard step={3} title="Pickup time" icon={CalendarDays}>
                  <label className={fieldClass}>Pickup date
                    <input required name="pickupDate" type="date" min={today} max={dateInIndia(new Date(now + 60 * oneDay))} value={pickupDate} onChange={(event) => { setPickupDate(event.target.value); setPickupSlot(""); }} disabled={busy} />
                  </label>
                  <fieldset className="grid gap-2" disabled={busy || !pickupDate || !pickupSlots.length}>
                    <legend className="mb-2 text-sm font-semibold text-foreground">Pickup time</legend>
                    {!pickupDate ? <p className="text-sm text-muted-foreground">Choose a date to see available times.</p> : (
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {pickupSlots.map((slot) => (
                          <label key={slot} className={cn("cursor-pointer rounded-xl border px-3 py-2.5 text-center text-sm font-semibold transition-colors has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-primary/30", pickupSlot === slot ? "border-primary bg-primary text-white" : "border-border bg-white text-foreground hover:border-primary/40")}>
                            <input className="sr-only" type="radio" name="pickupSlot" value={slot} required checked={pickupSlot === slot} onChange={() => setPickupSlot(slot)} />
                            {slot}
                          </label>
                        ))}
                      </div>
                    )}
                  </fieldset>
                  {!settings?.slots.length && <Alert>Pickup times are currently unavailable.</Alert>}
                  {pickupDate && Boolean(settings?.slots.length) && !pickupSlots.length && <Alert tone="info">No slots are left on this date. Choose a later pickup date.</Alert>}
                  <details className="group rounded-2xl border border-border p-4 open:bg-[#fafbf9]">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-foreground [&::-webkit-details-marker]:hidden">
                      <span>Delivery preference &amp; instructions <Optional /></span>
                      <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
                    </summary>
                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <label className={fieldClass}>Preferred delivery date<input name="deliveryDate" type="date" min={earliestDelivery} max={dateInIndia(new Date(now + 90 * oneDay))} disabled={busy} /></label>
                      <label className={fieldClass}>Preferred delivery time
                        <select name="deliverySlot" defaultValue="" disabled={busy || !settings?.slots.length}>
                          <option value="">Any available time</option>
                          {settings?.slots.map((slot) => <option key={slot}>{slot}</option>)}
                        </select>
                      </label>
                      <label className={cn(fieldClass, "sm:col-span-2")}>Special instructions<textarea name="instructions" maxLength={1000} disabled={busy} placeholder="Stains, delicate fabrics, gate code…" /></label>
                    </div>
                  </details>
                </StepCard>

                <StepCard step={4} title="Payment" icon={CreditCard}>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {[
                      settings?.cod && { value: "COD" as const, title: "Cash on delivery", text: "Pay when your laundry is delivered." },
                      settings?.onlinePayments && { value: "RAZORPAY" as const, title: "Pay online", text: "UPI, cards and netbanking via Razorpay." },
                    ].filter(Boolean).map((option) => option && (
                      <label key={option.value} className={cn("flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors", selectedMethod === option.value ? "border-primary bg-[#ecf6ee] ring-1 ring-primary/30" : "border-border hover:border-primary/40")}>
                        <input className="mt-1 size-4 accent-primary" name="method" type="radio" value={option.value} checked={selectedMethod === option.value} onChange={() => setMethod(option.value)} disabled={busy} />
                        <span><span className="block font-semibold text-foreground">{option.title}</span><span className="text-sm text-muted-foreground">{option.text}</span></span>
                      </label>
                    ))}
                  </div>
                  {!selectedMethod && <Alert>Payment is currently unavailable.</Alert>}
                </StepCard>
              </form>
            </>
          )}
        </div>

        <aside className={cn(card, "grid min-w-0 gap-5 lg:sticky lg:top-28")} aria-labelledby="summary-heading">
          <div className="flex items-center justify-between gap-3">
            <h2 id="summary-heading" className="text-lg font-bold text-foreground">Order summary</h2>
            <span className="rounded-full bg-[#f0f2ef] px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">{itemCount} {itemCount === 1 ? "service" : "services"}</span>
          </div>
          {canBook && slotChosen && (
            <div className="grid gap-1.5 rounded-2xl bg-[#f5f8f6] p-3 text-sm">
              <p className="flex items-center gap-2 text-foreground"><CalendarDays className="size-4 shrink-0 text-primary" aria-hidden="true" /> {pickupDate} · {pickupSlot}</p>
              {chosenAddress && <p className="flex items-center gap-2 text-muted-foreground"><MapPin className="size-4 shrink-0 text-primary" aria-hidden="true" /> {chosenAddress.label}, {chosenAddress.city}</p>}
            </div>
          )}
          <form className="grid gap-2" onSubmit={(event) => {
            event.preventDefault();
            setCoupon(couponDraft.trim().toUpperCase());
            setQuotingRevision((value) => value + 1);
            setQuoteState(undefined);
          }}>
            <label className={fieldClass}>Coupon code
              <div className="flex gap-2">
                <input value={couponDraft} onChange={(event) => setCouponDraft(event.target.value)} placeholder="Enter a code" maxLength={40} disabled={busy} className="min-w-0 flex-1 uppercase placeholder:normal-case" />
                <button className={cn(btn.outline, "h-11 shrink-0")} type="submit" disabled={busy || !couponDraft.trim() || !validItems.length}>Apply</button>
              </div>
            </label>
            {coupon && <button type="button" className={cn(btn.link, "justify-self-start")} onClick={() => { setCoupon(""); setCouponDraft(""); }} disabled={busy}>Remove code {coupon}</button>}
          </form>

          {quoteError ? <Alert>{quoteError}</Alert> : quote ? <PriceBreakdown quote={quote} /> : validItems.length > 0 ? <p role="status" className="text-sm text-muted-foreground">Calculating total…</p> : <p className="text-sm text-muted-foreground">Add an available service for a quote.</p>}
          {settings?.minimum ? <p className="text-xs text-muted-foreground">Minimum service subtotal: {rupees(settings.minimum)}.</p> : null}
          {orderError && <Alert>{orderError}</Alert>}
          {canBook && (
            <button className={cn(btn.cta, "hidden h-12 w-full text-base lg:inline-flex")} type="submit" form="booking-form" disabled={submitDisabled}>
              {busy && <Loader2 className="animate-spin" aria-hidden="true" />}
              {submitLabel}
            </button>
          )}
          <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground"><ShieldCheck className="size-3.5 shrink-0 text-primary" aria-hidden="true" /> Free pickup · Your exact total is confirmed before you pay</p>
        </aside>
      </div>

      {/* Mobile: total and the main action stay in reach while scrolling. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_#1d211e14] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Total · {itemCount} {itemCount === 1 ? "service" : "services"}</p>
            <p className="text-xl font-extrabold text-foreground">{quote ? rupees(quote.total) : "…"}</p>
          </div>
          {canBook ? (
            <button className={cn(btn.cta, "h-12 shrink-0 px-6 text-base")} type="submit" form="booking-form" disabled={submitDisabled}>
              {busy && <Loader2 className="animate-spin" aria-hidden="true" />}
              {busy ? "Confirming…" : selectedMethod === "RAZORPAY" ? "Pay now" : "Confirm"}
            </button>
          ) : !cart.user ? (
            <Link href="/login?next=%2Fbook" className={cn(btn.cta, "h-12 shrink-0 px-6 text-base")}>Log in to book</Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function StepCard({ step, title, icon: Icon, action, children }: { step: number; title: string; icon: LucideIcon; action?: ReactNode; children: ReactNode }) {
  return (
    <section className={cn(card, "grid min-w-0 grid-cols-1 gap-4")} aria-labelledby={`step-${step}`}>
      <div className="flex items-center justify-between gap-3">
        <h2 id={`step-${step}`} className="flex min-w-0 items-center gap-3 text-lg font-bold text-foreground">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-sm text-white" aria-hidden="true">{step}</span>
          <span className="flex items-center gap-2">{title}<Icon className="hidden size-4 text-muted-foreground sm:block" aria-hidden="true" /></span>
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

const fallbackImage = "/images/wash-fold.webp";

function ServiceThumb({ service }: { service?: Service }) {
  const src = service?.image || fallbackImage;
  return (
    <span className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-[#ecf6ee] sm:size-16">
      <Image src={src} alt="" fill sizes="64px" className="object-cover" unoptimized={src.startsWith("http")} />
    </span>
  );
}

/** First booking step when the cart is empty: choose services here instead of leaving the page. */
function ServicePicker({ services, onAdd }: { services: Service[]; onAdd: (serviceId: string) => void }) {
  if (!services.length) return <Empty icon={ShoppingBag} title="No services available" message="Services will appear here once they are published." href="/" linkText="Back to home" />;
  return (
    <section aria-labelledby="pick-heading">
      <div className="mb-5">
        <h2 id="pick-heading" className="text-xl font-bold text-foreground">Choose your services</h2>
        <p className="mt-1 text-sm text-muted-foreground">Add one or more. Next you’ll pick an address, a pickup time and how to pay.</p>
      </div>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {services.map((service) => {
          const src = service.image || fallbackImage;
          return (
            <li key={service.id} className="flex flex-col overflow-hidden rounded-3xl border border-border bg-white shadow-[0_1px_3px_#1d211e0a]">
              <div className="relative aspect-[16/10] bg-[#ecf6ee]">
                <Image src={src} alt="" fill sizes="(min-width: 1280px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover" unoptimized={src.startsWith("http")} />
                <span className="absolute top-3 left-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-foreground">{service.category}</span>
              </div>
              <div className="flex flex-1 flex-col gap-3 p-4">
                <div>
                  <p className="font-bold text-foreground">{service.name}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{service.description}</p>
                </div>
                <div className="mt-auto flex items-center justify-between gap-3">
                  <p className="text-lg font-extrabold text-foreground">{rupees(service.price)}<span className="text-sm font-medium text-muted-foreground"> / {unitLabel(service.unit)}</span></p>
                  <button type="button" className={cn(btn.primary, "shrink-0")} onClick={() => onAdd(service.id)} aria-label={`Add ${service.name}`}><Plus className="size-4" aria-hidden="true" /> Add</button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function PriceBreakdown({ quote }: { quote: Quote }) {
  const row = "flex items-center justify-between text-sm";
  return (
    <dl className="grid gap-2.5">
      <div className={row}><dt className="text-muted-foreground">Subtotal</dt><dd className="font-medium">{rupees(quote.subtotal)}</dd></div>
      <div className={row}><dt className="text-muted-foreground">Pickup &amp; delivery</dt><dd className="font-medium">{quote.deliveryFee ? rupees(quote.deliveryFee) : "Free"}</dd></div>
      {quote.tax > 0 && <div className={row}><dt className="text-muted-foreground">Tax</dt><dd className="font-medium">{rupees(quote.tax)}</dd></div>}
      {quote.discount > 0 && <div className={row}><dt className="text-muted-foreground">Discount</dt><dd className="font-medium text-emerald-700">−{rupees(quote.discount)}</dd></div>}
      <div className="mt-1 flex items-center justify-between border-t border-border pt-3"><dt className="font-bold text-foreground">Total</dt><dd className="text-xl font-extrabold text-foreground">{rupees(quote.total)}</dd></div>
    </dl>
  );
}
