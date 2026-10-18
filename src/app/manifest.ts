import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Wedding OS",
    short_name: "Wedding OS",
    description: "Plan every detail, control every rupee, and enjoy the journey.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#fbf8f2",
    theme_color: "#7b1e2b",
    categories: ["lifestyle", "productivity"],
    // PNGs for Android home screens and app stores; the SVG for desktop.
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
