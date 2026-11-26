import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/customer/auth-form";
import { CustomerScreen, Loading } from "@/components/customer/screen";

export const metadata: Metadata = { title: "Verify email", referrer: "no-referrer", robots: { index: false, follow: false } };

export default function Page() {
  return (
    <Suspense fallback={<CustomerScreen title="Verify email"><Loading /></CustomerScreen>}>
      <AuthForm mode="verify" />
    </Suspense>
  );
}
