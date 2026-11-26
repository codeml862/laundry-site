"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { navigation } from "@/components/site/navigation";

/** Dashboards (admin operations and the customer account) have their own layout, so the marketing header and footer stay off them. */
export function isDashboard(pathname: string | null) {
  if (pathname === "/account") return true;
  return pathname === "/admin" || (!!pathname?.startsWith("/admin/") && pathname !== "/admin/login");
}

/** Sticky header that turns into a frosted bar with a shadow once the page scrolls. */
export function HeaderShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 8);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  if (isDashboard(pathname)) return null;

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b transition-[background-color,box-shadow,border-color] duration-300",
        scrolled
          ? "border-border bg-[#ecf6ee] shadow-[0_8px_30px_#1f2a2212]"
          : "border-transparent bg-[#ecf6ee]",
      )}
    >
      {children}
    </header>
  );
}

function useHash() {
  const [hash, setHash] = useState("");
  useEffect(() => {
    const update = () => setHash(window.location.hash);
    update();
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  return hash;
}

export function DesktopNav() {
  const pathname = usePathname();
  const hash = useHash();

  function active(href: string) {
    const [path, section] = href.split("#");
    if (section) return pathname === "/" && hash === "#" + section;
    return pathname === path && (path !== "/" || !hash);
  }

  return (
    <nav aria-label="Main navigation" className="mx-auto hidden lg:block">
      <ul className="flex items-center gap-1 xl:gap-3">
        {navigation.map(({ href, label }) => {
          const current = active(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={current ? "page" : undefined}
                onClick={() => {
                  // Same-page hash links don't always fire hashchange in the App Router.
                  setTimeout(() => window.dispatchEvent(new HashChangeEvent("hashchange")), 0);
                }}
                className={cn(
                  "relative block px-2.5 py-2 text-[0.95rem] font-semibold whitespace-nowrap transition-colors xl:px-3",
                  "after:absolute after:inset-x-2.5 after:-bottom-1 after:h-[3px] after:rounded-full after:bg-primary after:transition-transform after:duration-300 xl:after:inset-x-3",
                  current
                    ? "text-primary after:scale-x-100"
                    : "text-foreground after:scale-x-0 hover:text-primary hover:after:scale-x-100",
                )}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
