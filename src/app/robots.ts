import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/admin", "/account", "/login", "/register", "/forgot-password", "/reset-password", "/verify-email"],
    },
    sitemap: new URL("/sitemap.xml", siteUrl()).href,
  };
}
