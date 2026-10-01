import type { NextConfig } from "next";

// GitHub Pages serves project sites from a sub-path, so the exported bundle
// has to be mounted at the repository name instead of the domain root.
const basePath = process.env.NEXT_BASE_PATH ?? "";
const isStaticExport = process.env.NEXT_STATIC_EXPORT === "1";

// `headers()` is dropped under a static export, both because it cannot be
// enforced by the host and because Next warns about it on every build.
const useServerHeaders = !isStaticExport;

const nextConfig: NextConfig = {
  ...(isStaticExport ? { output: "export" } : {}),
  reactCompiler: true,
  devIndicators: false,
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
  ...(useServerHeaders
    ? {
        async headers() {
          return [
            {
              source: "/(.*)",
              headers: [
                { key: "X-Content-Type-Options", value: "nosniff" },
                { key: "X-Frame-Options", value: "DENY" },
                {
                  key: "Referrer-Policy",
                  value: "strict-origin-when-cross-origin",
                },
              ],
            },
            {
              source: "/sw.js",
              headers: [
                {
                  key: "Content-Type",
                  value: "application/javascript; charset=utf-8",
                },
                {
                  key: "Cache-Control",
                  value: "no-cache, no-store, must-revalidate",
                },
                {
                  key: "Content-Security-Policy",
                  value: "default-src 'self'; script-src 'self'",
                },
              ],
            },
          ];
        },
      }
    : {}),
};

export default nextConfig;
