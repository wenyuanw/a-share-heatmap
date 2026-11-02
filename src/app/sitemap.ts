import type { MetadataRoute } from "next";

import { getPosts } from "@/lib/blog";
import { marketScopes } from "@/data/markets";
import { siteConfig } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getPosts();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteConfig.url, changeFrequency: "hourly", priority: 1 },
    { url: `${siteConfig.url}/features`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${siteConfig.url}/guide`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteConfig.url}/market`, changeFrequency: "weekly", priority: 0.8 },
    ...marketScopes.map(
      (scope): MetadataRoute.Sitemap[number] => ({
        url: `${siteConfig.url}/market/${scope.slug}`,
        changeFrequency: "weekly",
        priority: 0.7,
      }),
    ),
    { url: `${siteConfig.url}/self-host`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteConfig.url}/embed`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteConfig.url}/changelog`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${siteConfig.url}/whats-new`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${siteConfig.url}/sponsors`, changeFrequency: "monthly", priority: 0.5 },
  ];

  const blogRoutes: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${siteConfig.url}/whats-new/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...blogRoutes];
}
