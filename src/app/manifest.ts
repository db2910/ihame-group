import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "IHAME Logistics & Supply",
    short_name: "IHAME",
    description: "Freight forwarding & hardware shop management system",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f8f9",
    theme_color: "#2875b4",
    icons: [
      { src: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
