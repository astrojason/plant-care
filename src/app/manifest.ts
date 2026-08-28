import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Plant Care",
    short_name: "Plant Care",
    description: "Identify plants, diagnose issues, and track watering, fertilizing, and misting.",
    start_url: "/",
    display: "standalone",
    background_color: "#161826",
    theme_color: "#161826",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
