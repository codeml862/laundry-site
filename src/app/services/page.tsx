import type { Metadata } from "next";
import { ServiceCatalog } from "@/components/customer/catalog";
import { pageSeo } from "@/lib/seo";

export const metadata: Metadata = pageSeo("Laundry services", "Explore laundry, ironing, dry cleaning and specialist care. Compare prices and turnaround times, then book a pickup.", "/services");

export default function Page() {
  return (
    <main id="main-content">
      <ServiceCatalog />
    </main>
  );
}
