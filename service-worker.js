self.addEventListener('install', (event) => {
    event.waitUntil(
      caches.open('my-cache').then((cache) => {
        return cache.addAll([
          './',
          './index.html',
          './main.css',
          './app.js',
          './icons/icon-96x96.png',
          './icons/icon-128x128.png',
          './icons/icon-152x152.png',
          './icons/icon-192x192.png',
          './icons/icon-512x512.png',
          './music/mozart-overture-to-the-marriage-of-figaro-k.mp3',

        ]);
      })
    );
  });
  
  self.addEventListener('fetch', (event) => {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  });
  