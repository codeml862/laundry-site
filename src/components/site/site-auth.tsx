"use client";

import { LayoutDashboard, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Role = "CUSTOMER" | "ADMIN" | "STAFF" | "RIDER";
const AuthContext = createContext<Role | null>(null);

export function SiteAuth({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [role, setRole] = useState<Role | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function refreshRole() {
      try {
        const response = await fetch("/api/auth", { signal: controller.signal, cache: "no-store" });
        if (!response.ok) return;
        const data: { user: { role: Role } | null } = await response.json();
        if (!controller.signal.aborted) setRole(data.user?.role ?? null);
      } catch {
        // The public links still work if the session check is unavailable.
      }
    }

    void refreshRole();
    window.addEventListener("focus", refreshRole);
    return () => {
      controller.abort();
      window.removeEventListener("focus", refreshRole);
    };
  }, [pathname]);

  return <AuthContext.Provider value={role}>{children}</AuthContext.Provider>;
}

const pill = "h-11 rounded-full px-5 text-[0.95rem] font-semibold";
const outline = cn(buttonVariants({ variant: "outline" }), pill, "border-2 border-primary bg-white text-primary hover:bg-primary hover:text-primary-foreground");
const book = cn(buttonVariants(), pill, "bg-primary px-5 text-white shadow-[0_10px_24px_#1e7f3a26] hover:bg-primary/90");

/** Header actions by role. `stacked` renders the full-width account button for the mobile sheet. */
export function SiteAccountLinks({ stacked = false }: { stacked?: boolean }) {
  const role = useContext(AuthContext);
  const size = stacked ? "h-12 w-full rounded-xl" : "";

  const account =
    role && role !== "CUSTOMER"
      ? <Link className={cn(outline, size)} href="/admin"><LayoutDashboard aria-hidden="true" /> Dashboard</Link>
      : role === "CUSTOMER"
        ? <Link className={cn(outline, size)} href="/account"><UserRound aria-hidden="true" /> My Account</Link>
        : <Link className={cn(outline, size)} href="/login">Sign In</Link>;

  // The admin runs operations; only customers and visitors see the booking button.
  if (stacked || (role && role !== "CUSTOMER")) return account;

  return (
    <>
      {account}
      <Link className={cn(book, "hidden sm:inline-flex")} href="/book">
        Book a Pickup
      </Link>
    </>
  );
}
