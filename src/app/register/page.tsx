import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/customer/auth-form";
import { CustomerScreen, Loading } from "@/components/customer/screen";
import { SignedOut } from "@/components/customer/signed-out";

export const metadata: Metadata = { title: "Create an account" };

export default function Page() {
  return (
    <Suspense fallback={<CustomerScreen title="Create an account"><Loading /></CustomerScreen>}>
      <SignedOut><AuthForm mode="register" /></SignedOut>
    </Suspense>
  );
}
