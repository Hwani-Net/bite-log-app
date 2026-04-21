import type { MetadataRoute } from "next";

const BASE_URL = "https://bite-log-app.web.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    { path: "/", changeFrequency: "daily" as const, priority: 1.0 },
    {
      path: "/bite-forecast",
      changeFrequency: "daily" as const,
      priority: 0.9,
    },
    { path: "/record", changeFrequency: "weekly" as const, priority: 0.8 },
    { path: "/records", changeFrequency: "daily" as const, priority: 0.8 },
    { path: "/stats", changeFrequency: "weekly" as const, priority: 0.7 },
    { path: "/concierge", changeFrequency: "weekly" as const, priority: 0.7 },
    { path: "/ranking", changeFrequency: "daily" as const, priority: 0.7 },
    { path: "/news", changeFrequency: "daily" as const, priority: 0.7 },
    { path: "/feed", changeFrequency: "daily" as const, priority: 0.6 },
    {
      path: "/season-forecast",
      changeFrequency: "monthly" as const,
      priority: 0.6,
    },
    {
      path: "/regulations",
      changeFrequency: "monthly" as const,
      priority: 0.6,
    },
    { path: "/booking", changeFrequency: "weekly" as const, priority: 0.5 },
    { path: "/settings", changeFrequency: "monthly" as const, priority: 0.3 },
    { path: "/privacy", changeFrequency: "yearly" as const, priority: 0.1 },
    { path: "/terms", changeFrequency: "yearly" as const, priority: 0.1 },
  ];

  return routes.map((route) => ({
    url: `${BASE_URL}${route.path}`,
    lastModified: new Date(),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
