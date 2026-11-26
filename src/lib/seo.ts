import type { Metadata } from "next";

/** APP_URL is the canonical origin; Vercel supplies a domain before a custom one is configured. */
export function siteUrl() {
  const origin = process.env.APP_URL?.trim()
    || (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`)
    || (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`)
    || "http://localhost:3000";
  const url = new URL(origin);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("APP_URL must use http or https.");
  return new URL(url.origin);
}

export const siteName = "Quicklywash";
export const siteDescription = "Book a pickup for laundry, ironing or dry cleaning. See service prices upfront and track your order from collection to delivery.";
const image = { url: "/images/hero-basket.webp", alt: "Freshly folded laundry ready for pickup and delivery" };

export function pageSeo(title: string, description: string, path: string): Metadata {
  const fullTitle = title === siteName ? `${siteName} | Laundry Pickup & Delivery` : `${title} | ${siteName}`;
  return {
    title: { absolute: fullTitle },
    description,
    alternates: { canonical: path },
    robots: { index: true, follow: true },
    openGraph: { title: fullTitle, description, url: path, siteName, type: "website", locale: "en_IN", images: [image] },
    twitter: { card: "summary_large_image", title: fullTitle, description, images: [image.url] },
  };
}
