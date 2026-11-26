import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/customer/auth-form";
import { CustomerScreen, Loading } from "@/components/customer/screen";
import { SignedOut } from "@/components/customer/signed-out";

export const metadata: Metadata = { title: "Forgot password" };

export default function Page() {
  return (
    <Suspense fallback={<CustomerScreen title="Forgot password"><Loading /></CustomerScreen>}>
      <SignedOut><AuthForm mode="forgot" /></SignedOut>
    </Suspense>
  );
}
