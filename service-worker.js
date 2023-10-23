self.addEventListener('install', (event) => {
    event.waitUntil(
      caches.open('my-cache').then((cache) => {
        return cache.addAll([
          './',
          // './index.html',
          // './main.css',
          // './app.js',
          'icons/icon-96x96.png',
          'icons/icon-128x128.png',
          'icons/icon-152x152.png',
          'icons/icon-192x192.png',
          'icons/icon-512x512.png',
          'music/bach-cello-suite-1-prelude.mp3',
          // 'music/debussy-clair-de-lune.mp3',
          // 'music/beethoven-piano-sonata-14-moonlight.mp3',
          // 'music/beethoven-symphony-9-choral-excerpt.mp3.',
          // 'music/chopin-nocturne-2-e-flat-major.mp3',
          // 'music/debussy-prelude-to-the-afternoon-of-a-faun.mp3',
          // 'music/la-traviata-brindisi-verdi.mp3',
          // 'music/mozart-overture-to-the-marriage-of-figaro-k.mp3',
          // 'music/mozart-string-quartet-21-prussian.mp3'

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
  