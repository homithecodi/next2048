"use client";

import { useEffect } from "react";

const SERVICE_WORKER_URL = "/sw.js";

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
          scope: "/",
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
