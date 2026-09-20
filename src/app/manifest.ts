import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "WhatHeThinks",
    short_name: "WhatHeThinks",
    description: "Read the pattern behind his texts with a private WhatsApp chat analysis.",
    start_url: "/",
    display: "standalone",
    background_color: "#fcfaf8",
    theme_color: "#2e1f33",
    icons: [{ src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "any" }],
  };
}
