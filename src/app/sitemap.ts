import type { MetadataRoute } from "next";
import { absoluteUrl, allRoutes, CONTENT_UPDATED } from "@/lib/seo";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date(CONTENT_UPDATED);
  return allRoutes().map((path) => ({
    url: absoluteUrl(path),
    lastModified,
    changeFrequency: path === "/" ? "monthly" : "yearly",
    priority: path === "/" ? 1 : path.startsWith("/tjenester/") ? 0.8 : 0.6,
  }));
}
