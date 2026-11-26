import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";

/** Next.js serves this route as /sitemap.xml using the deployment's canonical origin. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { path: "/", priority: 1, changeFrequency: "weekly" as const },
    { path: "/services", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "/book", priority: 0.8, changeFrequency: "monthly" as const },
    { path: "/privacy", priority: 0.3, changeFrequency: "yearly" as const },
    { path: "/terms", priority: 0.3, changeFrequency: "yearly" as const },
  ].map(({ path, ...entry }) => ({ url: new URL(path, siteUrl()).href, ...entry }));
}
