"use client";

import { Clock3, CreditCard, ReceiptText, Truck, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHomeCatalog } from "@/components/site/catalog-provider";

const rupees = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

type Fact = { icon: LucideIcon; title: string; detail: string };

function turnaround(hours: number) {
  return hours < 48 ? `${hours} hours` : `${Math.round(hours / 24)} days`;
}

/**
 * Key service facts, built only from live business settings and the active catalog.
 * Nothing is shown until real data is available, so there are no placeholder claims.
 */
export function AtAGlance() {
  const catalog = useHomeCatalog();
  const settings = catalog?.settings;
  const services = catalog?.services ?? [];
  if (!settings) return null;

  const facts: Fact[] = [];
  const fee = settings.deliveryFee;
  if (typeof fee === "number") {
    facts.push({ icon: Truck, title: fee === 0 ? "Free pickup & delivery" : `${rupees.format(fee / 100)} pickup & delivery`, detail: "Collected from and returned to your door" });
  }
  if (services.length) {
    facts.push({ icon: Clock3, title: `Ready in ${turnaround(Math.min(...services.map((service) => service.hours)))}`, detail: "Fastest service turnaround" });
  }
  if (settings.minimum) {
    facts.push({ icon: ReceiptText, title: `Minimum order ${rupees.format(settings.minimum / 100)}`, detail: settings.taxBps ? `Prices exclude ${settings.taxBps / 100}% tax` : "Total shown before you confirm" });
  }
  const methods = [settings.cod && "cash on delivery", settings.onlinePayments && "UPI & cards"].filter(Boolean);
  if (methods.length) {
    facts.push({ icon: CreditCard, title: methods.length > 1 ? "Cash or online payment" : methods[0] === "cash on delivery" ? "Cash on delivery" : "Pay online", detail: `Pay by ${methods.join(" or ")}` });
  }
  if (facts.length < 2) return null;

  return (
    <section aria-label="At a glance" className="relative z-10 -mt-8 sm:-mt-10 lg:-mt-12">
      <div className="container">
        <ul className="flex flex-wrap rounded-3xl border border-border bg-white px-2 shadow-[0_24px_60px_#1d211e14] sm:px-4">
          {facts.map(({ icon: Icon, title, detail }, index) => (
            <li
              key={title}
              className={cn(
                "flex w-full items-center gap-3 px-3 py-3 sm:w-1/2 sm:gap-4 sm:px-4 sm:py-6",
                facts.length >= 4 ? "lg:w-1/4" : facts.length === 3 ? "lg:w-1/3" : "",
                index > 0 && "border-t border-border sm:border-t-0",
                index >= 2 && "sm:border-t lg:border-t-0",
                index % 2 === 1 && "sm:border-l sm:pl-6",
                index > 0 && "lg:border-l lg:pl-6",
              )}
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary text-primary sm:size-12">
                <Icon className="size-[22px]" aria-hidden="true" />
              </span>
              <span className="grid min-w-0 gap-0.5">
                <strong className="text-[0.95rem] leading-snug font-bold text-foreground">{title}</strong>
                <span className="text-sm leading-snug text-muted-foreground">{detail}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
