import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Wedding OS",
    short_name: "Wedding OS",
    description: "Plan every detail, control every rupee, and enjoy the journey.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#fbf8f2",
    theme_color: "#7b1e2b",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
