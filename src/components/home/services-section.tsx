"use client";

import { ArrowRight, Check, Clock3, Plus, ShoppingBag } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/components/customer/cart";
import { cn } from "@/lib/utils";
import { useHomeCatalog } from "@/components/site/catalog-provider";

const rupees = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const unitSuffix = { KG: "/kg", ITEM: "/item", FIXED: "" } as const;
const fallbackImage = "/images/wash-fold.webp";

function turnaround(hours: number) {
  return hours < 48 ? `${hours}h` : `${Math.round(hours / 24)} days`;
}

export function ServicesSection() {
  const catalog = useHomeCatalog();
  const cart = useCart();
  const [category, setCategory] = useState("All");

  const services = useMemo(() => catalog?.services ?? [], [catalog]);
  const categories = useMemo(() => ["All", ...new Set(services.map((service) => service.category))], [services]);
  const visible = (category === "All" ? services : services.filter((service) => service.category === category)).slice(0, 6);
  const inCart = new Set(cart.items.map((item) => item.serviceId));
  const loading = !catalog;

  return (
    <section id="services" aria-labelledby="services-title" className="relative bg-white py-10 sm:py-20 lg:py-24">
      <div className="container">
        <div className="flex flex-col gap-4 sm:gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <Badge variant="secondary" className="h-7 rounded-full px-3 text-xs font-bold tracking-[0.08em] text-primary uppercase">
              Services
            </Badge>
            <h2 id="services-title" className="mt-4 text-[2.1rem] leading-[1.08] font-extrabold tracking-[-0.045em] text-foreground sm:text-[2.6rem] lg:text-5xl">
              Care for every fabric, <span className="text-primary">priced upfront.</span>
            </h2>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground sm:text-lg">
              Pick what you need, add it to your pickup, and see the total before you confirm.
            </p>
          </div>
          <Link
            href="/services"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "group h-11 shrink-0 self-start rounded-full px-5 font-semibold text-foreground hover:border-primary/40 hover:text-primary md:self-auto",
            )}
          >
            View all services
            <ArrowRight className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </div>

        {categories.length > 2 && (
          <div role="group" aria-label="Filter by category" className="mt-5 flex max-w-full gap-2 overflow-x-auto pb-1 [scrollbar-width:none] sm:mt-8 sm:flex-wrap">
            {categories.map((name) => (
              <button
                key={name}
                type="button"
                aria-pressed={category === name}
                onClick={() => setCategory(name)}
                className={cn(
                  "h-10 shrink-0 rounded-full border px-4 text-sm font-semibold transition-colors",
                  category === name
                    ? "border-primary bg-primary text-primary-foreground shadow-[0_6px_16px_#1e7f3a33]"
                    : "border-border bg-white text-muted-foreground hover:border-primary/40 hover:text-primary",
                )}
              >
                {name}
              </button>
            ))}
          </div>
        )}

        <ul className="mt-5 grid gap-4 sm:mt-8 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6">
          {loading && Array.from({ length: 3 }, (_, index) => (
            <li key={index} className="overflow-hidden rounded-3xl border border-border">
              <Skeleton className="aspect-[4/3] rounded-none" />
              <div className="grid gap-3 p-5">
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </li>
          ))}

          {visible.map((service) => {
            const added = inCart.has(service.id);
            return (
              <li
                key={service.id}
                className="group flex flex-col overflow-hidden rounded-3xl border border-border bg-white shadow-[0_2px_8px_#1f2a2208] transition-[box-shadow,transform,border-color] duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_22px_44px_#1f2a2217]"
              >
                <div className="relative aspect-[16/9] overflow-hidden bg-[#e8f9ed] sm:aspect-[4/3]">
                  <Image
                    src={service.image || fallbackImage}
                    alt=""
                    fill
                    sizes="(max-width: 639px) calc(100vw - 40px), (max-width: 1023px) 45vw, 380px"
                    unoptimized={Boolean(service.image?.startsWith("http"))}
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                  <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
                    <span className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-foreground shadow-sm backdrop-blur">
                      {service.category}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-foreground/80 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
                      <Clock3 className="size-3.5" aria-hidden="true" /> {turnaround(service.hours)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-1 flex-col p-4 sm:p-5">
                  <h3 className="text-lg font-bold tracking-[-0.02em] text-foreground">{service.name}</h3>
                  <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{service.description}</p>

                  <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-4 sm:pt-5">
                    <p className="leading-none">
                      <span className="block text-xs font-medium text-muted-foreground">{service.unit === "FIXED" ? "Price" : "From"}</span>
                      <span className="mt-1 block text-2xl font-extrabold tracking-tight text-foreground">
                        {rupees.format(service.price / 100)}
                        <span className="text-sm font-semibold text-muted-foreground">{unitSuffix[service.unit]}</span>
                      </span>
                    </p>
                    <Button
                      type="button"
                      variant={added ? "secondary" : "outline"}
                      disabled={!cart.ready}
                      onClick={() => cart.setQuantity(service.id, added ? 0 : 1)}
                      aria-pressed={added}
                      aria-label={added ? `Remove ${service.name} from your pickup` : `Add ${service.name} to your pickup`}
                      className={cn(
                        "h-10 rounded-full px-4 font-semibold",
                        added
                          ? "bg-primary/10 text-primary hover:bg-primary/15"
                          : "border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground",
                      )}
                    >
                      {added ? <><Check aria-hidden="true" /> Added</> : <><Plus aria-hidden="true" /> Add</>}
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        {catalog && !services.length && (
          <p className="mt-8 rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
            Our service list is being updated. Please check back soon.
          </p>
        )}

        {cart.items.length > 0 && (
          <div className="sticky bottom-4 z-20 mt-8 flex justify-center">
            <Link
              href="/book"
              className={cn(
                buttonVariants(),
                "h-12 rounded-full bg-(--cta) px-6 text-base font-semibold text-white shadow-[0_12px_30px_#f37a1f55] hover:bg-(--cta-hover)",
              )}
            >
              <ShoppingBag aria-hidden="true" />
              Continue to booking · {cart.items.length} {cart.items.length === 1 ? "service" : "services"}
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
