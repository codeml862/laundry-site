"use client";

import { Mail, Phone } from "lucide-react";
import { getWithRetry } from "@/components/customer/http";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Unit = "KG" | "ITEM" | "FIXED";
type Catalog = {
  services: { id: string; name: string; description: string; price: number; unit: Unit; hours: number; image: string | null; category: string }[];
  settings?: { businessName?: string; logo?: string; contactEmail?: string; contactPhone?: string; serviceAreas?: string[]; minimum?: number; deliveryFee?: number; taxBps?: number; slots?: string[]; cod?: boolean; onlinePayments?: boolean; operatingHours?: string };
  reviews?: { name: string; rating: number; comment: string; createdAt: string }[];
};

const CatalogContext = createContext<Catalog | null>(null);

export function HomeCatalog({ children }: { children: ReactNode }) {
  const [catalog, setCatalog] = useState<Catalog | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    // Retries temporary outages; if it still fails, settle on an empty catalog so sections leave their loading state.
    getWithRetry<Catalog>("/api/catalog", { signal: controller.signal })
      .then((data) => setCatalog(data))
      .catch(() => { if (!controller.signal.aborted) setCatalog({ services: [], reviews: [] }); });
    return () => controller.abort();
  }, []);

  return <CatalogContext.Provider value={catalog}>{children}</CatalogContext.Provider>;
}

export function useHomeCatalog() {
  return useContext(CatalogContext);
}

export function ContactDetails({ className }: { className?: string }) {
  const catalog = useContext(CatalogContext);
  const email = catalog?.settings?.contactEmail;
  const phone = catalog?.settings?.contactPhone;

  if (!email && !phone) return null;

  return (
    <div className={`flex flex-wrap gap-x-5 gap-y-2 text-sm [&_a]:inline-flex [&_a]:items-center [&_a]:gap-1.5 [&_a]:transition-colors ${className ?? ""}`}>
      {email && <a href={`mailto:${email}`}><Mail className="size-4" aria-hidden="true" />{email}</a>}
      {phone && <a href={`tel:${phone.replace(/[^\d+]/g, "")}`}><Phone className="size-4" aria-hidden="true" />{phone}</a>}
    </div>
  );
}
