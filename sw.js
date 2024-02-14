const cacheName = 'cache-v1';
const filesToCache = [
    '/clipboard-history',
    '/clipboard-history/index.html',
    '/clipboard-history/styles.css',
    '/clipboard-history/scripts.js',
    '/clipboard-history/db.js',
    '/clipboard-history/uuidv4.min.js',
    '/clipboard-history/manifest.json',
    '/clipboard-history/icons/clipboard.png',
    '/clipboard-history/icons/del.png',
];

self.addEventListener('install', e => {
    console.log('[ServiceWorker] Install');
    e.waitUntil(
        caches.open(cacheName).then(cache => {
            console.log('[ServiceWorker] Caching app shell');
            return cache.addAll(filesToCache);
        })
    );
});

self.addEventListener('activate', e => {
    console.log('[ServiceWorker] Activate');
    e.waitUntil(
        caches.keys().then(keyList => {
            return Promise.all(keyList.map((key) => {
                if (key !== cacheName) {
                    console.log('[ServiceWorker] Removing old cache', key);
                    return caches.delete(key);
                }
            }));
        })
    );
});

self.addEventListener('fetch', e => {
    console.log('[Service Worker] Fetch', e.request.url);
    if (e.request.url.startsWith('chrome-extension://')) {
        return;
    }
    e.respondWith(
        caches.match(e.request).then(cachedResponse => {
            const networkFetch = fetch(e.request).then(response => {
                // update the cache with a clone of the network response
                const responseClone = response.clone()
                caches.open(cacheName).then(cache => {
                    cache.put(e.request, responseClone)
                })
                return response
            }).catch(function (reason) {
                console.error('[ServiceWorker] fetch failed: ', reason)
            })
            // prioritize cached response over network
            return cachedResponse || networkFetch
        }
        )
    )
})