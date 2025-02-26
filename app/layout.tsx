import type { Metadata } from "next";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { SessionProvider } from "next-auth/react";
import "./globals.css";
import "@rainbow-me/rainbowkit/styles.css";
import Providers from "@/components/providers/providers";

const baseUrl = "https://javin.ai";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: "Javin.ai",
  description:
    "A focused, no-nonsense AI search engine for crypto and blockchain.",
  manifest: "/manifest.json",
  openGraph: {
    title: "Javin.ai",
    description:
      "A focused, no-nonsense AI search engine for crypto and blockchain.",
    images: [
      {
        url: `${baseUrl}/images/javin/preview/javin_preview.jpg?v=v2`,
        width: 1200,
        height: 630,
        alt: "Javin.ai",
      },
    ],
  },
};

export const viewport = {
  maximumScale: 1, // Disable auto-zoom on mobile Safari
};

const LIGHT_THEME_COLOR = "hsl(0 0% 100%)";
const DARK_THEME_COLOR = "hsl(240deg 10% 3.92%)";
const THEME_COLOR_SCRIPT = `\
(function() {
  var html = document.documentElement;
  var meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  function updateThemeColor() {
    var isDark = html.classList.contains('dark');
    meta.setAttribute('content', isDark ? '${DARK_THEME_COLOR}' : '${LIGHT_THEME_COLOR}');
  }
  var observer = new MutationObserver(updateThemeColor);
  observer.observe(html, { attributes: true, attributeFilter: ['class'] });
  updateThemeColor();
})();`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      // `next-themes` injects an extra classname to the body element to avoid
      // visual flicker before hydration. Hence the `suppressHydrationWarning`
      // prop is necessary to avoid the React hydration mismatch warning.
      // https://github.com/pacocoursey/next-themes?tab=readme-ov-file#with-app
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: THEME_COLOR_SCRIPT,
          }}
        />
        <link rel="icon" href="/images/icon/j_white.png" type="image/png" />
      </head>
      <body className="antialiased">
        {/* dont remove below div. it is for modal */}
        <Providers>
          <Toaster position="top-center" />
          {children}
        </Providers>
      </body>
    </html>
  );
}
