"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Clock3, Loader2, Minus, Package, Plus, Scale, Search, Shirt, ShoppingBag, Tag } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCart } from "@/components/customer/cart";
import { duration, maxCartQuantity, maxCartServices, type Catalog, type Service } from "@/components/customer/data";
import { rupees } from "@/components/customer/http";
import { useData } from "@/components/customer/use-data";

const unitSuffix = { KG: "/ kg", ITEM: "/ item", FIXED: "" } as const;

const pricing = [
  { icon: Scale, title: "By weight", text: "Everyday loads priced per kilogram, weighed at pickup." },
  { icon: Shirt, title: "By item", text: "Individual garments and household items, priced per piece." },
  { icon: Tag, title: "Fixed price", text: "A single price for the whole service, e.g. a pair of shoes." },
];

function ServiceImage({ service }: { service: Service }) {
  const [broken, setBroken] = useState(false);
  if (!service.image || broken) {
    return <div className="grid size-full place-items-center text-primary"><Shirt className="size-12" aria-hidden="true" /></div>;
  }
  return (
    <Image
      src={service.image}
      alt=""
      fill
      sizes="(min-width: 1280px) 384px, (min-width: 1024px) 30vw, (min-width: 640px) 45vw, calc(100vw - 40px)"
      unoptimized={service.image.startsWith("http")}
      onError={() => setBroken(true)}
      className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
    />
  );
}

export function ServiceCatalog() {
  const catalog = useData<Catalog>("/api/catalog");
  const cart = useCart();
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");

  const services = useMemo(() => catalog.data?.services ?? [], [catalog.data]);
  const categories = useMemo(() => [...new Set(services.map((service) => service.category))].sort(), [services]);
  const query = search.trim().toLowerCase();
  const visible = services.filter((service) =>
    (!category || service.category === category) &&
    (!query || [service.name, service.description, service.category].some((value) => value.toLowerCase().includes(query))));

  const itemCount = cart.items.length;
  const cartTotal = cart.items.reduce((total, item) => {
    const service = services.find((entry) => entry.id === item.serviceId);
    return service ? total + Math.round(service.price * item.quantity) : total;
  }, 0);

  return (
    <>
      {/* Page header */}
      <section className="relative isolate overflow-hidden bg-[#f4faf5]">
        <div aria-hidden="true" className="pointer-events-none absolute -top-32 -right-24 -z-10 size-[30rem] rounded-full bg-[#dff0e3] blur-3xl" />
        <div className="container py-8 sm:py-16 lg:py-20">
          <p className="inline-flex items-center gap-2 rounded-full bg-[#e3f1e6] px-4 py-2 text-sm font-semibold text-primary">
            <Tag className="size-4" aria-hidden="true" /> Services &amp; pricing
          </p>
          <h1 className="mt-4 max-w-3xl text-[2rem] leading-[1.05] font-extrabold tracking-[-0.045em] text-foreground sm:mt-5 sm:text-5xl lg:text-6xl">
            Care for every kind of <span className="text-primary italic">laundry.</span>
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground sm:mt-4 sm:text-lg">
            Choose the services you need, compare prices and turnaround times, and add them to your pickup.
          </p>
          <label className="mt-5 flex h-12 min-w-0 max-w-xl items-center gap-2 rounded-2xl border border-border bg-white px-3.5 shadow-[0_12px_30px_#1d211e0f] focus-within:border-primary focus-within:ring-3 focus-within:ring-primary/15 sm:mt-8 sm:h-14 sm:gap-3 sm:px-4">
            <Search className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="sr-only">Search services</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search services…"
              className="h-full w-full min-w-0 bg-transparent text-base outline-none placeholder:text-muted-foreground"
            />
          </label>
        </div>
      </section>

      <section className="container min-w-0 py-6 sm:py-12" aria-label="Services">
        {catalog.loading && (
          <div className="grid min-h-60 place-items-center text-muted-foreground" role="status">
            <span className="inline-flex items-center gap-2"><Loader2 className="size-5 animate-spin text-primary" /> Finding available services…</span>
          </div>
        )}

        {catalog.error && (
          <div className="grid justify-items-start gap-3">
            <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200">{catalog.error}</p>
            <button className={cn(buttonVariants({ variant: "outline" }), "rounded-full")} onClick={catalog.refresh}>Try again</button>
          </div>
        )}

        {!catalog.loading && !catalog.error && !services.length && (
          <div className="flex flex-col items-center rounded-3xl border border-dashed border-border px-6 py-14 text-center">
            <Package className="size-10 text-primary" aria-hidden="true" />
            <h2 className="mt-3 text-lg font-bold">No services available yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">Please check back soon for our updated service list.</p>
          </div>
        )}

        {services.length > 0 && (
          <>
            {/* Category filter */}
            <div role="group" aria-label="Service categories" className="flex max-w-full gap-2 overflow-x-auto pb-2 [scrollbar-width:none] sm:flex-wrap">
              {["", ...categories].map((entry) => (
                <button
                  key={entry || "all"}
                  type="button"
                  aria-pressed={category === entry}
                  onClick={() => setCategory(entry)}
                  className={cn(
                    "h-10 shrink-0 rounded-full border px-4 text-sm font-semibold transition-colors",
                    category === entry
                      ? "border-primary bg-primary text-primary-foreground shadow-[0_6px_16px_#1e7f3a33]"
                      : "border-border bg-white text-muted-foreground hover:border-primary/40 hover:text-primary",
                  )}
                >
                  {entry || "All services"}
                  <span className="ml-1.5 text-xs opacity-75">({entry ? services.filter((service) => service.category === entry).length : services.length})</span>
                </button>
              ))}
            </div>

            {visible.length ? (
              <ul className="mt-4 grid gap-4 sm:mt-8 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:gap-6">
                {visible.map((service) => {
                  const quantity = cart.items.find((item) => item.serviceId === service.id)?.quantity ?? 0;
                  const max = service.unit === "FIXED" ? 1 : maxCartQuantity;
                  const cartFull = !quantity && itemCount >= maxCartServices;
                  return (
                    <li
                      key={service.id}
                      className="group flex min-w-0 flex-col overflow-hidden rounded-3xl border border-border bg-white shadow-[0_2px_8px_#1d211e08] transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_22px_44px_#1d211e14]"
                    >
                      <div className="relative aspect-[16/9] overflow-hidden bg-[#ecf6ee] sm:aspect-[4/3]">
                        <ServiceImage key={service.image ?? "icon"} service={service} />
                        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
                          <span className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-foreground shadow-sm backdrop-blur">{service.category}</span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#1d211e]/75 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
                            <Clock3 className="size-3.5" aria-hidden="true" /> {duration(service.hours)}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-1 flex-col p-4 sm:p-5">
                        <h2 className="text-lg font-bold tracking-[-0.02em] text-foreground">{service.name}</h2>
                        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{service.description}</p>

                        <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-4 sm:pt-5">
                          <p className="leading-none">
                            <span className="block text-xs font-medium text-muted-foreground">{service.unit === "FIXED" ? "Price" : "From"}</span>
                            <span className="mt-1 block text-2xl font-extrabold tracking-tight text-foreground">
                              {rupees(service.price)} <span className="text-sm font-semibold text-muted-foreground">{unitSuffix[service.unit]}</span>
                            </span>
                          </p>

                          {quantity > 0 ? (
                            <div className="flex items-center gap-1 rounded-full bg-[#ecf6ee] p-1" role="group" aria-label={`${service.name} quantity`}>
                              <button
                                type="button"
                                onClick={() => cart.setQuantity(service.id, quantity - 1)}
                                aria-label={quantity <= 1 ? `Remove ${service.name}` : `Decrease ${service.name}`}
                                className="grid size-11 place-items-center rounded-full bg-white text-primary shadow-sm hover:bg-primary hover:text-white"
                              >
                                <Minus className="size-4" />
                              </button>
                              <span className="min-w-8 text-center text-sm font-bold text-primary" aria-live="polite">{quantity}</span>
                              <button
                                type="button"
                                disabled={quantity + 1 > max}
                                onClick={() => cart.setQuantity(service.id, quantity + 1)}
                                aria-label={`Increase ${service.name}`}
                                className="grid size-11 place-items-center rounded-full bg-white text-primary shadow-sm hover:bg-primary hover:text-white disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-primary"
                              >
                                <Plus className="size-4" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              disabled={!cart.ready || cartFull}
                              onClick={() => cart.setQuantity(service.id, 1)}
                              aria-label={`Add ${service.name} to your pickup`}
                              className={cn(buttonVariants({ variant: "outline" }), "h-10 rounded-full border-2 border-primary px-4 font-semibold text-primary hover:bg-primary hover:text-primary-foreground")}
                            >
                              <Plus aria-hidden="true" /> Add
                            </button>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-4 rounded-3xl border border-dashed border-border px-4 py-8 text-center text-muted-foreground [overflow-wrap:anywhere] sm:mt-8 sm:px-6 sm:py-12">
                No services match “{search}”. Try a different search or category.
              </p>
            )}

            {/* How pricing works */}
            <div className="mt-6 grid gap-4 rounded-3xl bg-[#f4faf5] p-4 sm:mt-14 sm:p-8 md:grid-cols-3">
              {pricing.map(({ icon: Icon, title, text }) => (
                <div key={title} className="flex gap-3.5">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-primary shadow-sm"><Icon className="size-5" aria-hidden="true" /></span>
                  <div className="min-w-0">
                    <p className="font-bold text-foreground">{title}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Sticky cart bar */}
      {itemCount > 0 && (
        <div className="sticky bottom-4 z-30 pb-4">
          <div className="container">
            <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#0f2417] px-4 py-3 text-white shadow-[0_20px_50px_#0f241759] sm:gap-4 sm:px-5">
              <p className="flex min-w-0 items-center gap-2 text-sm sm:gap-3" aria-live="polite">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/10"><ShoppingBag className="size-5" aria-hidden="true" /></span>
                <span className="min-w-0 [overflow-wrap:anywhere]">
                  <strong className="block text-base">{itemCount} {itemCount === 1 ? "service" : "services"} added</strong>
                  <span className="text-white/70">Estimated {rupees(cartTotal)}{itemCount >= maxCartServices ? " · cart is full" : ""}</span>
                </span>
              </p>
              <Link href="/book" className={cn(buttonVariants(), "group h-11 w-full shrink-0 rounded-full bg-(--cta) px-5 font-semibold text-white hover:bg-(--cta-hover) min-[400px]:w-auto")}>
                Continue <ArrowRight className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
