import type { Metadata } from "next";
import { Suspense } from "react";
import Operations, { AdminAccess } from "@/components/dashboard/operations";
import type { Snapshot } from "@/components/dashboard/types";
import { adminSnapshot } from "@/lib/server/admin-snapshot";
import { requireRole } from "@/lib/server/guards";

export const metadata: Metadata = {
  title: "Operations",
  robots: { index: false, follow: false },
};

/** Operations team: visitors go to the admin login, customers to their account. */
async function AuthorizedOperations() {
  const user = await requireRole(["ADMIN", "STAFF", "RIDER"], "/admin");
  if (!user.verified) return <AdminAccess status={403} />;
  // Load the dashboard data in the same server pass as the access check, so the
  // browser does not have to hydrate and then wait on a second /api/admin request.
  // The JSON round trip gives the client the same shape /api/admin returns (dates as strings).
  const initial = JSON.parse(JSON.stringify(await adminSnapshot(user))) as Snapshot;
  return <Operations initialSnapshot={initial} />;
}

export default function AdminPage() {
  return <Suspense fallback={<AdminAccess loading />}><AuthorizedOperations /></Suspense>;
}
