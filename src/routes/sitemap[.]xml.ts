import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = "https://lady-vanillaice.com";

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

const entries: SitemapEntry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/ueber-mich", changefreq: "monthly", priority: "0.9" },
  { path: "/leistungen", changefreq: "monthly", priority: "0.9" },
  { path: "/preise", changefreq: "monthly", priority: "0.9" },
  { path: "/kalender", changefreq: "daily", priority: "0.9" },
  { path: "/online", changefreq: "monthly", priority: "0.7" },
  { path: "/duo-sessions", changefreq: "monthly", priority: "0.7" },
  { path: "/content-dreh", changefreq: "monthly", priority: "0.5" },
  { path: "/custom", changefreq: "monthly", priority: "0.6" },
  { path: "/fotoshooting", changefreq: "monthly", priority: "0.5" },
  { path: "/erfahrungsberichte", changefreq: "weekly", priority: "0.7" },
  { path: "/journal", changefreq: "weekly", priority: "0.8" },
  { path: "/journal/erstes-mal-domina-ablauf", changefreq: "monthly", priority: "0.7" },
  { path: "/journal/unterschied-domina-vs-escort", changefreq: "monthly", priority: "0.7" },
  { path: "/journal/bdsm-lexikon-wichtige-begriffe", changefreq: "monthly", priority: "0.7" },
  
  
  { path: "/buchung", changefreq: "monthly", priority: "0.9" },
  { path: "/kontakt", changefreq: "monthly", priority: "0.7" },
  { path: "/faq", changefreq: "monthly", priority: "0.7" },
  { path: "/agb", changefreq: "yearly", priority: "0.3" },
  { path: "/datenschutz", changefreq: "yearly", priority: "0.3" },
  { path: "/impressum", changefreq: "yearly", priority: "0.3" },
];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ].filter(Boolean).join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
