import type { MetadataRoute } from "next";

// Required so the route can be prerendered into `out/manifest.webmanifest`.
export const dynamic = "force-static";

const DESCRIPTION = "A 2048 Game Powered by NextJS";

// Exported sites can live under a sub-path (GitHub Pages project sites), so
// every URL in the manifest is anchored to the mount point.
const basePath = process.env.NEXT_BASE_PATH ?? "";
const resolve = (path: string) => `${basePath}${path}`;

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: resolve("/"),
    name: "Next 2048",
    short_name: "2048",
    description: DESCRIPTION,
    lang: "en",
    dir: "ltr",
    start_url: resolve("/"),
    scope: resolve("/"),
    display: "standalone",
    orientation: "any",
    categories: ["games", "entertainment"],
    background_color: "#ffffff",
    theme_color: "#edc22e",
    icons: [
      {
        src: resolve("/icons/icon-192.png"),
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: resolve("/icons/icon-512.png"),
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: resolve("/icons/icon-maskable-192.png"),
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: resolve("/icons/icon-maskable-512.png"),
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
