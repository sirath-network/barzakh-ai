import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Barzakh Agents",
    short_name: "Barzakh Agents",
    description:
      "Intelligent, focused AI search powering crypto and blockchain insights.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#000000",
    icons: [
      {
        src: "/images/javin/SirathLogo.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
      {
        src: "/images/javin/SirathLogo-192px.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/images/javin/SirathLogo-512px.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    screenshots: [
      {
        src: "/images/javin/screenshots/Screenshot_400x800.png",
        sizes: "400x800",
        type: "image/png",
      },
      {
        src: "/images/javin/screenshots/Screenshot_1280x960.png",
        sizes: "1280x960",
        type: "image/png",
      },
    ],
  };
}
