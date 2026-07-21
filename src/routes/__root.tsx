import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Header } from "../components/site/Header";
import { Footer } from "../components/site/Footer";
import { AgeGate } from "../components/site/AgeGate";
import { StickyContact } from "../components/site/StickyContact";
import { LanguageProvider, useT } from "../i18n";

function NotFoundComponent() {
  const t = useT();
  return (
    <div className="flex min-h-screen items-center justify-center bg-anthracite px-4">
      <div className="max-w-md text-center">
        <div className="eyebrow mb-4">{t<string>("notFound.kicker")}</div>
        <h1 className="font-display text-6xl gold-text">{t<string>("notFound.title")}</h1>
        <p className="mt-4 text-sm text-vanilla/60">
          {t<string>("notFound.body")}
        </p>
        <div className="mt-8">
          <Link to="/" className="btn-gold">{t<string>("notFound.home")}</Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  const t = useT();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-anthracite px-4">
      <div className="max-w-md text-center">
        <div className="eyebrow mb-4">{t<string>("errorPage.kicker")}</div>
        <h1 className="font-display text-3xl text-vanilla">{t<string>("errorPage.title")}</h1>
        <p className="mt-4 text-sm text-vanilla/60">
          {t<string>("errorPage.body")}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button onClick={() => { router.invalidate(); reset(); }} className="btn-gold">
            {t<string>("errorPage.retry")}
          </button>
          <a href="/" className="btn-outline-gold">{t<string>("errorPage.home")}</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Lady Vanilla Ice – Domina in München & Umgebung | BDSM Sessions" },
      { name: "description", content: "Stilvolle Domina-Sessions in München und Umgebung. Diskret, intensiv und individuell auf deine Fantasien abgestimmt. Termin online buchen." },
      { name: "author", content: "Lady Vanilla Ice" },
      { name: "rating", content: "adult" },
      { property: "og:site_name", content: "Lady Vanilla Ice" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600;700&family=Italiana&family=Inter:wght@300;400;500;600&display=swap",
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              name: "Lady Vanilla Ice",
              url: "https://lady-vanillaice.com",
              logo: "https://lady-vanillaice.com/favicon.svg",
              sameAs: [
                "https://www.instagram.com/lady_vanillaice",
                "https://t.me/ladyvanillaice",
              ],
            },
            {
              "@type": "WebSite",
              name: "Lady Vanilla Ice",
              url: "https://lady-vanillaice.com",
            },
          ],
        }),
      },
    ],
  }),

  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="de">
      <head>
        <HeadContent />
      </head>
      <body>
        <LanguageProvider>{children}</LanguageProvider>
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1">
          <Outlet />
        </main>
        <Footer />
        <AgeGate />
        <StickyContact />
      </div>
    </QueryClientProvider>
  );
}
