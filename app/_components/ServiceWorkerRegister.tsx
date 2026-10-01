"use client";

import { useEffect } from "react";

// Inlined at build time; empty locally and set to the repository sub-path
// (e.g. "/next2048") when exporting for GitHub Pages.
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const SERVICE_WORKER_URL = `${BASE_PATH}/sw.js`;
const SERVICE_WORKER_SCOPE = `${BASE_PATH}/`;

// Caching hashed dev chunks makes edits appear stale, so dev stays off by
// default. Set NEXT_PUBLIC_ENABLE_SW=1 to exercise PWA behaviour locally.
const ENABLED =
  process.env.NODE_ENV === "production" ||
  process.env.NEXT_PUBLIC_ENABLE_SW === "1";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!ENABLED) return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker
        .register(SERVICE_WORKER_URL, {
          scope: SERVICE_WORKER_SCOPE,
          updateViaCache: "none",
        })
        .catch(() => {});
    };

    if (document.readyState === "complete") {
      register();
      return;
    }

    window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
