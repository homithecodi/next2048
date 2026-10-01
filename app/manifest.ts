import type { MetadataRoute } from "next";

const DESCRIPTION = "A 2048 Game Powered by NextJS";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Next 2048",
    short_name: "2048",
    description: DESCRIPTION,
    lang: "en",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    categories: ["games", "entertainment"],
    background_color: "#ffffff",
    theme_color: "#edc22e",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
