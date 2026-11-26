"use client";

import { ArrowRight, Clock3, Mail, Phone } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Brand } from "@/components/site/brand";
import { useHomeCatalog } from "@/components/site/catalog-provider";
import { isDashboard } from "@/components/site/header-shell";

const columns = [
  {
    title: "Explore",
    links: [
      { href: "/services", label: "Services" },
      { href: "/#how-it-works", label: "How It Works" },
      { href: "/#pricing", label: "Pricing" },
      { href: "/#about", label: "About Us" },
    ],
  },
  {
    title: "Help",
    links: [
      { href: "/account", label: "My Account" },
      { href: "/account?tab=support", label: "Order Support" },
      { href: "/#faq", label: "FAQs" },
      { href: "/#contact", label: "Contact" },
    ],
  },
];

export function SiteFooter() {
  const settings = useHomeCatalog()?.settings;
  const name = settings?.businessName || "Quicklywash";
  if (isDashboard(usePathname())) return null;

  return (
    <footer className="bg-[#0f2417] text-white/75">
      <div className="container">
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 py-8 sm:gap-10 sm:py-14 lg:grid-cols-[1.4fr_1fr_1fr_1.3fr] lg:gap-12 lg:py-16">
          <div className="col-span-2 min-w-0 lg:col-span-1">
            <Brand light />
            <p className="mt-5 max-w-xs text-sm leading-relaxed">
              Pickup, cleaning and delivery for the things you wear and use every day.
            </p>
            <Link
              href="/book"
              className={cn(buttonVariants(), "group mt-6 h-11 rounded-full bg-(--cta) px-5 font-semibold text-white hover:bg-(--cta-hover)")}
            >
              Book a Pickup
              <ArrowRight className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Link>
          </div>

          {columns.map(({ title, links }) => (
            <nav key={title} aria-label={title}>
              <p className="text-sm font-bold tracking-wide text-white uppercase">{title}</p>
              <ul className="mt-4 grid gap-2.5 text-sm">
                {links.map(({ href, label }) => (
                  <li key={href}>
                    <Link href={href} className="transition-colors hover:text-white">{label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <div className="col-span-2 min-w-0 lg:col-span-1">
            <p className="text-sm font-bold tracking-wide text-white uppercase">Get in touch</p>
            <ul className="mt-4 grid gap-3 text-sm">
              {settings?.contactPhone && (
                <li>
                  <a href={`tel:${settings.contactPhone.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-2.5 transition-colors hover:text-white">
                    <Phone className="size-4 shrink-0 text-[#7fd49a]" aria-hidden="true" /> {settings.contactPhone}
                  </a>
                </li>
              )}
              {settings?.contactEmail && (
                <li>
                  <a href={`mailto:${settings.contactEmail}`} className="inline-flex items-center gap-2.5 break-all transition-colors hover:text-white">
                    <Mail className="size-4 shrink-0 text-[#7fd49a]" aria-hidden="true" /> {settings.contactEmail}
                  </a>
                </li>
              )}
              {settings?.operatingHours && (
                <li className="flex items-center gap-2.5">
                  <Clock3 className="size-4 shrink-0 text-[#7fd49a]" aria-hidden="true" /> {settings.operatingHours}
                </li>
              )}
              {!settings?.contactPhone && !settings?.contactEmail && (
                <li>
                  <Link href="/account?tab=support" className="transition-colors hover:text-white">Contact us from your account</Link>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/10 py-6 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p>© {name}. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="transition-colors hover:text-white">Privacy Policy</Link>
            <Link href="/terms" className="transition-colors hover:text-white">Terms of Service</Link>
          </div>
        </div>
        <p aria-hidden="true" className="pointer-events-none px-2 pt-2 pb-5 text-center text-[clamp(1.75rem,11vw,9rem)] leading-tight font-extrabold tracking-[-0.04em] break-words text-white/30 italic select-none sm:pb-6">
          {name}
        </p>
      </div>
    </footer>
  );
}
