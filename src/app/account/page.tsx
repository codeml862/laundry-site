import type { Metadata } from "next";
import { Loader2 } from "lucide-react";
import { Suspense } from "react";
import { Account } from "@/components/customer/account";
import { requireRole } from "@/lib/server/guards";

export const metadata: Metadata = { title: "My account", robots: { index: false, follow: false } };

/** Customers only: visitors are sent to login, admins to their dashboard. */
async function CustomerAccount() {
  await requireRole(["CUSTOMER"], "/account");
  return <Account />;
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-svh place-items-center bg-[#f6f7fb] text-muted-foreground" role="status">
          <span className="inline-flex items-center gap-2"><Loader2 className="size-5 animate-spin text-primary" /> Loading your account…</span>
        </div>
      }
    >
      <CustomerAccount />
    </Suspense>
  );
}
