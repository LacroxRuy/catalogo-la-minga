const CACHE = "la-minga-clasico-ids-noticias-ofertas-v11";

const CORE_ASSETS = [
  "./",
  "./index.html",
  "./styles.css?v=11",
  "./config.js?v=10",
  "./productos.js?v=10",
  "./app.js?v=11",
  "./manifest.webmanifest",
  "./icon.svg",
  "./og-catalogo.png",
  "./imagenes-productos/productos/sin-imagen.webp"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE)
          .map(key => caches.delete(key))
      )
    )
  );

  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  const isMutableImage =
    url.pathname.includes("/imagenes-novedades/") ||
    url.pathname.includes("/imagenes-productos/");

  if (isMutableImage) {
    event.respondWith(
      fetch(event.request, { cache: "no-store" })
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then(cache => {
              cache.put(event.request, copy);
            });
          } else {
            caches.open(CACHE).then(cache => {
              cache.delete(event.request);
            });
          }

          return response;
        })
        .catch(() => caches.match(event.request))
    );

    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      const network = fetch(event.request).then(response => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then(cache => {
            cache.put(event.request, copy);
          });
        }

        return response;
      });

      return cached || network;
    })
  );
});
