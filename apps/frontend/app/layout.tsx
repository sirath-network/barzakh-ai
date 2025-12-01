import type { Metadata } from "next";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { Web3Provider } from "@/components/providers/web3-provider";
import { SessionProvider } from "next-auth/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const baseUrl = "https://barzakh.framer.ai";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: "Barzakh AI",
  description:
    "Intelligent, focused AI search powering crypto and blockchain insights.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/images/barzakh/logo-white.svg", type: "image/svg+xml" },
      { url: "/images/barzakh/SirathLogo-192px.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/images/barzakh/SirathLogo-192px.png",
  },
  openGraph: {
    title: "Barzakh AI",
    description:
      "Intelligent, focused AI search powering crypto and blockchain insights.",
    images: [
      {
        url: `${baseUrl}/images/barzakh/preview/barzakh_preview_banner.png`,
        width: 1200,
        height: 630,
        alt: "Barzakh AI",
      },
    ],
  },
};

export const viewport = {
  maximumScale: 1, // Disable auto-zoom on mobile Safari
};

const LIGHT_THEME_COLOR = "hsl(0 0% 100%)";
const DARK_THEME_COLOR = "hsl(240deg 10% 3.92%)";
const LIGHT_FAVICON = "/images/barzakh/logo-white.svg";
const DARK_FAVICON = "/images/barzakh/logo-dark.svg";
const THEME_COLOR_SCRIPT = `\
(function() {
  var html = document.documentElement;
  var meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }

  function updateThemeAssets() {
    var isDark = html.classList.contains('dark');
    meta.setAttribute('content', isDark ? '${DARK_THEME_COLOR}' : '${LIGHT_THEME_COLOR}');

    var links = document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]');
    if (links.length === 0) {
      var link = document.createElement('link');
      link.setAttribute('rel', 'icon');
      link.setAttribute('type', 'image/svg+xml');
      document.head.appendChild(link);
      links = document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]');
    }

    // Invert favicon for contrast: use light icon on dark theme and dark icon on light theme
    links.forEach(function(link) {
      if (link.getAttribute('type') === 'image/svg+xml' || !link.getAttribute('type')) {
        link.setAttribute('href', isDark ? '${LIGHT_FAVICON}' : '${DARK_FAVICON}');
        link.setAttribute('type', 'image/svg+xml');
      }
    });
  }

  var observer = new MutationObserver(updateThemeAssets);
  observer.observe(html, { attributes: true, attributeFilter: ['class'] });
  updateThemeAssets();
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
      </head>
      <body className="antialiased">
        {/* dont remove below div. it is for modal */}
        <SessionProvider refetchInterval={5 * 60} refetchOnWindowFocus={true}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <Web3Provider>
              <Toaster position="top-center" />
              {children}
              <SpeedInsights />
            </Web3Provider>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}