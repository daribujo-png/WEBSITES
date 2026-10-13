import type { Metadata, Viewport } from "next";
import "./globals.css";
import { fontVariables } from "@/lib/fonts";
import { OG_IMAGE, SITE_URL, TITLE_TEMPLATE } from "@/lib/seo";
import { generalContractorJsonLd } from "@/lib/jsonld";
import { company, pages, ui } from "@/content";
import { RevealObserver, SmoothScroll } from "@/components/providers";
import { Cursor, JsonLd } from "@/components/ui";
import { Footer, Header, MobileActionBar } from "@/components/layout";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: pages.home.title,
    template: TITLE_TEMPLATE,
  },
  description: pages.home.description,
  applicationName: company.name,
  formatDetection: { telephone: false, email: false, address: false },
  openGraph: {
    type: "website",
    locale: "nb_NO",
    siteName: company.legalName,
    title: pages.home.title,
    description: pages.home.description,
    url: "/",
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: pages.home.title,
    description: pages.home.description,
    images: [OG_IMAGE.url],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Matches --color-night: the page opens on the dark hero stage.
  themeColor: "#0e1416",
  colorScheme: "light",
};

/** Marks <html class="js"> before first paint so reveal states never hide content without JS. */
const JS_FLAG = "document.documentElement.classList.add('js')";

/**
 * Root layout.
 * Slot conventions for page authors (SECTIONS agent):
 * - Each page renders only its sections; <main id="innhold"> is provided here.
 * - The header is fixed and overlays the page. Pages that do not start with a
 *   full-bleed dark stage must add top space: `pt-header` (= var(--header-h)).
 * - Give every band a tone: <Section tone="paper|chalk|paper-deep|night|slate">.
 * - The home page h1 is the hero headline; every other page has exactly one h1.
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="nb" className={fontVariables} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: JS_FLAG }} />
      </head>
      <body data-tone="paper">
        <a href="#innhold" className="skip-link">
          {ui.skipLink}
        </a>
        <JsonLd data={generalContractorJsonLd()} />
        <SmoothScroll>
          <Header />
          <main id="innhold" tabIndex={-1} className="outline-none">
            {children}
          </main>
          <Footer />
          <MobileActionBar />
        </SmoothScroll>
        <RevealObserver />
        <Cursor />
      </body>
    </html>
  );
}
