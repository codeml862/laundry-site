import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthForm } from "@/components/customer/auth-form";
import { CustomerScreen, Loading } from "@/components/customer/screen";
import { currentUser } from "@/lib/server/auth";

export const metadata: Metadata = { title: "Team sign in", robots: { index: false, follow: false } };

/**
 * Sign-in for the operations team (admins, staff, riders). Not linked from the website: open /admin/login directly.
 * Team members already signed in go straight to the dashboard. A signed-in customer sees the form, and signing in
 * here replaces their customer session.
 */
async function TeamSignIn() {
  const user = await currentUser();
  if (user && user.role !== "CUSTOMER") redirect("/admin");
  return <AuthForm mode="admin" />;
}

export default function Page() {
  return (
    <Suspense fallback={<CustomerScreen title="Team sign in"><Loading /></CustomerScreen>}>
      <TeamSignIn />
    </Suspense>
  );
}
