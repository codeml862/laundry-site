"use client";

import { Check, Clock3, LifeBuoy, Mail, Phone, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useHomeCatalog } from "@/components/site/catalog-provider";
import { WhatsAppLink } from "@/components/site/whatsapp-link";
import { ContactForm } from "@/components/home/contact-form";

type Channel = { icon: LucideIcon; label: string; value: string; href?: string };

const promises = ["Doorstep pickup & delivery", "Express ready in about 3 hours", "Pay online or on delivery"];

/** Closing call to action plus contact channels; every channel comes from the business settings. */
export function ContactSection() {
  const settings = useHomeCatalog()?.settings;

  const channels: Channel[] = [];
  if (settings?.contactPhone) channels.push({ icon: Phone, label: "Call us", value: settings.contactPhone, href: `tel:${settings.contactPhone.replace(/[^\d+]/g, "")}` });
  if (settings?.contactEmail) channels.push({ icon: Mail, label: "Email", value: settings.contactEmail, href: `mailto:${settings.contactEmail}` });
  if (settings?.operatingHours) channels.push({ icon: Clock3, label: "Opening hours", value: settings.operatingHours });
  channels.push({ icon: LifeBuoy, label: "Help with an order", value: "Raise a request from your account", href: "/account?tab=support" });

  return (
    <section id="contact" aria-labelledby="contact-title" className="py-8 sm:py-16">
      <div className="container">
        <div className="grid grid-cols-1 overflow-hidden rounded-3xl border border-border lg:grid-cols-2">
          <div className="min-w-0 bg-[#0f2e1a] p-5 text-white sm:p-8 lg:p-10">
            <p className="text-sm font-bold tracking-[0.12em] text-[#8fdba6] uppercase">Ready when you are</p>
            <h2 id="contact-title" className="mt-2 text-[1.75rem] leading-[1.1] font-extrabold tracking-[-0.04em] sm:mt-3 sm:text-[2.5rem]">
              Skip laundry day. <br className="hidden sm:block" />We’ll pick it up.
            </h2>
            <p className="mt-3 max-w-md text-base leading-relaxed text-white/75">Book in under a minute and choose a pickup slot that suits you.</p>
            <ul className="mt-4 grid gap-2 sm:mt-5 sm:gap-2.5">
              {promises.map((promise) => (
                <li key={promise} className="flex items-center gap-2.5 text-sm text-white/90">
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[#8fdba6] text-[#0f2e1a]"><Check className="size-3" strokeWidth={3} aria-hidden="true" /></span>
                  {promise}
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap gap-2 sm:mt-6 sm:gap-3">
              <Link href="/book" className="inline-flex h-11 items-center rounded-full bg-(--cta) px-5 text-sm font-semibold text-white transition-colors hover:bg-(--cta-hover)">
                Book a pickup
              </Link>
              <Link href="/#pricing" className="inline-flex h-11 items-center rounded-full border border-white/25 px-5 text-sm font-semibold text-white transition-colors hover:bg-white/10">
                See prices
              </Link>
            </div>
            <ul className="mt-4 grid gap-x-5 gap-y-3 border-t border-white/15 pt-4 sm:mt-6 sm:grid-cols-2 sm:gap-y-4 sm:pt-5">
              {channels.map(({ icon: Icon, label, value, href }) => {
                const body = (
                  <>
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/10 text-[#8fdba6]"><Icon className="size-4" aria-hidden="true" /></span>
                    <span className="grid min-w-0 gap-0.5">
                      <span className="text-xs font-semibold tracking-wide text-white/60 uppercase">{label}</span>
                      <span className="text-sm font-medium text-white [overflow-wrap:anywhere]">{value}</span>
                    </span>
                  </>
                );
                const row = "flex min-w-0 items-start gap-3 rounded-lg";
                return <li key={label} className="min-w-0">{href ? <a href={href} className={cn(row, "transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white")}>{body}</a> : <div className={row}>{body}</div>}</li>;
              })}
            </ul>
            <WhatsAppLink className="mt-5 h-10 w-full justify-center border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white sm:w-auto" />
          </div>

          <div className="relative min-w-0 bg-white p-5 sm:p-8 lg:p-10">
            <h3 className="text-2xl font-extrabold tracking-[-0.03em] text-foreground">Contact us</h3>
            <p className="mt-1.5 text-base leading-relaxed text-muted-foreground sm:mt-2">Have a question? Leave your details and we’ll get back to you.</p>
            <div className="mt-4 sm:mt-5"><ContactForm /></div>
          </div>
        </div>
      </div>
    </section>
  );
}
