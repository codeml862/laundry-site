import type { Metadata } from "next";
import { Suspense } from "react";
import { Booking } from "@/components/customer/booking";
import { CustomerScreen, Loading } from "@/components/customer/screen";
import { pageSeo } from "@/lib/seo";

export const metadata: Metadata = pageSeo("Book a pickup", "Choose laundry services, add your address and select a convenient pickup slot with Quicklywash.", "/book");

/**
 * Anyone can open the booking page and build a cart. Signing in (as a customer) is only
 * needed to confirm; team accounts see a note asking them to use a customer account.
 */
function CustomerBooking() {
  return <Booking />;
}

export default function Page() {
  return (
    <CustomerScreen eyebrow="Pickup booking" title="Book a pickup" description="Four quick steps: choose services, add your address, pick a time and pay.">
      <Suspense fallback={<Loading message="Loading booking…" />}>
        <CustomerBooking />
      </Suspense>
    </CustomerScreen>
  );
}
