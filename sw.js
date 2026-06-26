const CACHE_NAME = "lil-g-app-v9";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./manifest.webmanifest",
  "./src/app.js",
  "./src/appActions.js",
  "./src/avatarSettings.js",
  "./src/chatEngine.js",
  "./src/companionClient.js",
  "./src/memory.js",
  "./src/profileSync.js",
  "./src/screenCommands.js",
  "./src/speech.js",
  "./src/voiceSettings.js",
  "./src/webSearch.js",
  "./src/wakeWord.js",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png"
];
const APP_SHELL_URLS = new Set(APP_SHELL.map((path) => new URL(path, self.location.href).href));

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => caches.delete(cacheName))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(event.request.url);

  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(networkFirst(event.request, "./index.html"));
    return;
  }

  if (APP_SHELL_URLS.has(requestUrl.href)) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  event.respondWith(
    fetch(event.request).catch(async () => {
      const cachedResponse = await caches.match(event.request);

      if (cachedResponse) {
        return cachedResponse;
      }

      throw new Error("Network request failed and no cached response is available.");
    })
  );
});

async function networkFirst(request, fallbackPath) {
  try {
    const response = await fetch(request);

    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }

    return response;
  } catch {
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    if (fallbackPath) {
      const fallbackResponse = await caches.match(fallbackPath);

      if (fallbackResponse) {
        return fallbackResponse;
      }
    }

    throw new Error("Network request failed and no cached response is available.");
  }
}
