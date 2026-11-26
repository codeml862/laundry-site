"use client";

import { ArrowRight, Check, Clock3, Info, Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCart } from "@/components/customer/cart";
import { cn } from "@/lib/utils";
import { useHomeCatalog } from "@/components/site/catalog-provider";
import { PricingPlans } from "@/components/home/pricing-plans";

const rupees = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2, minimumFractionDigits: 0 });
const unitLabel = { KG: "per kg", ITEM: "per item", FIXED: "fixed price" } as const;

function turnaround(hours: number) {
  return hours < 48 ? `${hours} hrs` : `${Math.round(hours / 24)} days`;
}

/** Full price list grouped by category, in the style of a printed laundry rate card. */
export function PriceList() {
  const catalog = useHomeCatalog();
  const cart = useCart();
  const services = useMemo(() => catalog?.services ?? [], [catalog]);
  const groups = useMemo(() => {
    const map = new Map<string, typeof services>();
    for (const service of services) map.set(service.category, [...(map.get(service.category) ?? []), service]);
    return [...map.entries()];
  }, [services]);
  const inCart = new Set(cart.items.map((item) => item.serviceId));
  const settings = catalog?.settings;

  return (
    <section id="pricing" aria-labelledby="pricing-title" className="overflow-hidden bg-[#fcf9f1] py-10 sm:py-20 lg:py-24">
      <div className="container">
        <PricingPlans />
        <div className="mt-8 flex flex-col gap-4 sm:mt-14 sm:gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <Badge variant="secondary" className="h-7 rounded-full bg-white px-3 text-xs font-bold tracking-[0.08em] text-primary uppercase ring-1 ring-border">
              Price list
            </Badge>
            <h3 className="mt-4 text-2xl leading-[1.08] font-extrabold tracking-[-0.045em] text-foreground sm:text-3xl">
              Clear rates, <span className="text-primary">no surprises.</span>
            </h3>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground sm:text-lg">
              Every service, its rate and turnaround in one place. Your exact total is shown before you confirm a booking.
            </p>
          </div>
          <Link
            href="/services"
            className={cn(buttonVariants({ variant: "outline" }), "group h-11 shrink-0 self-start rounded-full bg-white px-5 font-semibold text-foreground hover:border-primary/40 hover:text-primary md:self-auto")}
          >
            Full service details
            <ArrowRight className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </div>

        <div className="mt-6 min-w-0 overflow-hidden rounded-3xl border border-border bg-[#fafcfa] sm:mt-10">
          {!catalog && (
            <div className="grid gap-4 p-6">
              <Skeleton className="h-10 w-full max-w-md rounded-full" />
              {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-14 w-full" />)}
            </div>
          )}

          {catalog && !groups.length && (
            <p className="p-10 text-center text-muted-foreground">Our price list is being updated. Please check back soon.</p>
          )}

          {groups.length > 0 && (
            <Tabs defaultValue={groups[0][0]} className="gap-0">
              <div className="border-b border-border bg-muted/50 p-3 sm:p-4">
                <TabsList className="h-auto w-full max-w-full justify-start gap-1 overflow-x-auto rounded-full bg-white p-1 ring-1 ring-border [scrollbar-width:none] group-data-horizontal/tabs:h-auto sm:w-auto">
                  {groups.map(([name, items]) => (
                    <TabsTrigger
                      key={name}
                      value={name}
                      className="h-9 flex-none rounded-full px-4 text-sm font-semibold text-muted-foreground data-active:bg-primary data-active:text-primary-foreground data-active:shadow-none"
                    >
                      {name}
                      <span className="ml-1 text-xs opacity-70">({items.length})</span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              {groups.map(([name, items]) => (
                <TabsContent key={name} value={name} className="p-4 sm:p-6">
                  <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-5">
                    {items.map((service) => {
                      const added = inCart.has(service.id);
                      return (
                        <li key={service.id} className={cn("group flex flex-col overflow-hidden rounded-2xl border bg-white transition-colors", added ? "border-primary" : "border-border hover:border-primary/40")}>
                          <div className="relative aspect-[16/10] overflow-hidden bg-secondary">
                            {service.image && (
                              <Image src={service.image} alt="" fill sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" unoptimized={service.image.startsWith("http")} />
                            )}
                            <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-foreground">
                              <Clock3 className="size-3.5 text-primary" aria-hidden="true" /> {turnaround(service.hours)}
                            </span>
                          </div>
                          <div className="flex flex-1 flex-col p-4 sm:p-5">
                            <h4 className="text-base font-bold text-foreground">{service.name}</h4>
                            <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{service.description}</p>
                            <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-4">
                              <p className="leading-none">
                                <span className="text-2xl font-extrabold tracking-tight text-foreground">{rupees.format(service.price / 100)}</span>
                                <span className="ml-1 text-sm text-muted-foreground">{unitLabel[service.unit]}</span>
                              </p>
                              <Button
                                type="button"
                                variant="outline"
                                disabled={!cart.ready}
                                onClick={() => cart.setQuantity(service.id, added ? 0 : 1)}
                                aria-pressed={added}
                                aria-label={added ? `Remove ${service.name} from your pickup` : `Add ${service.name} to your pickup`}
                                className={cn(
                                  "h-10 shrink-0 rounded-full px-4 font-semibold",
                                  added ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground" : "border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground",
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
                </TabsContent>
              ))}
            </Tabs>
          )}

          {settings && groups.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border bg-muted/50 px-4 py-4 sm:px-6">
              <p className="flex items-start gap-2 text-sm text-muted-foreground">
                <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                <span>
                  {settings.deliveryFee ? `Pickup & delivery ${rupees.format(settings.deliveryFee / 100)}` : "Free pickup & delivery"}
                  {settings.minimum ? ` · Minimum order ${rupees.format(settings.minimum / 100)}` : ""}
                  {settings.taxBps ? ` · Prices exclude ${settings.taxBps / 100}% tax` : ""}
                </span>
              </p>
              <Link
                href="/book"
                className={cn(buttonVariants(), "group h-11 rounded-full bg-(--cta) px-5 font-semibold text-white shadow-[0_10px_24px_#f37a1f38] hover:bg-(--cta-hover)")}
              >
                Book a pickup
                <ArrowRight className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
