self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('dlm-pacientes-v1').then((cache) => cache.addAll(['/']))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).catch(() => cached);
    })
  );
});
