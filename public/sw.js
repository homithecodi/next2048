const VERSION = "v1";
const SHELL_CACHE = `next-2048-shell-${VERSION}`;
const RUNTIME_CACHE = `next-2048-runtime-${VERSION}`;
const OWN_CACHES = [SHELL_CACHE, RUNTIME_CACHE];

// The site can be mounted under a sub-path (GitHub Pages), so every URL is
// resolved against the directory this worker was served from.
const BASE_PATH = new URL(self.location.pathname).pathname.replace(
  /\/sw\.js$/,
  ""
);

const OFFLINE_FALLBACK = `${BASE_PATH}/`;

const PRECACHE_URLS = [
  OFFLINE_FALLBACK,
  `${BASE_PATH}/manifest.webmanifest`,
  `${BASE_PATH}/icons/icon-192.png`,
  `${BASE_PATH}/icons/icon-512.png`,
  `${BASE_PATH}/icons/icon-maskable-192.png`,
  `${BASE_PATH}/icons/icon-maskable-512.png`,
];

const IMMUTABLE_PREFIXES = [
  `${BASE_PATH}/_next/static/`,
  `${BASE_PATH}/icons/`,
];

const SELF_PATH = `${BASE_PATH}/sw.js`;

const CACHEABLE_EXTENSIONS = new Set([
  ".css",
  ".ico",
  ".js",
  ".json",
  ".map",
  ".png",
  ".svg",
  ".webmanifest",
  ".woff2",
]);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) =>
        Promise.allSettled(
          PRECACHE_URLS.map((url) =>
            cache.add(new Request(url, { cache: "reload" }))
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !OWN_CACHES.includes(key))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname === SELF_PATH) return;

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request));
    return;
  }

  if (isImmutable(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (isCacheable(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

function isImmutable(pathname) {
  return IMMUTABLE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isCacheable(pathname) {
  const dot = pathname.lastIndexOf(".");
  if (dot === -1) return false;
  return CACHEABLE_EXTENSIONS.has(pathname.slice(dot).toLowerCase());
}

async function handleNavigation(request) {
  const cache = await caches.open(SHELL_CACHE);

  try {
    const response = await fetch(request);
    if (response.ok) cache.put(OFFLINE_FALLBACK, response.clone());
    return response;
  } catch {
    const shell = await caches.match(OFFLINE_FALLBACK);
    if (shell) return shell;
    return new Response("Offline", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(RUNTIME_CACHE);
    cache.put(request, response.clone());
  }
  return response;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);

  const network = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  if (cached) return cached;

  const response = await network;
  if (response) return response;

  throw new Error(`Unable to serve ${request.url} offline`);
}
