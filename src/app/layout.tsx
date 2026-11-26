import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@fontsource-variable/inter";
import { HomeCatalog } from "@/components/site/catalog-provider";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import "./globals.css";
import { siteDescription, siteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: {
    default: "Quicklywash | Laundry Pickup & Delivery",
    template: "%s | Quicklywash",
  },
  description: siteDescription,
  applicationName: "Quicklywash",
  robots: { index: false, follow: true },
  openGraph: { siteName: "Quicklywash", type: "website", locale: "en_IN" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className="font-sans">
      {/* Browser extensions (e.g. Grammarly) add attributes to <body> before React loads. */}
      <body suppressHydrationWarning>
        <HomeCatalog>
          <SiteHeader />
          {children}
          <SiteFooter />
        </HomeCatalog>
      </body>
    </html>
  );
}
