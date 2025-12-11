const CACHE_NAME = 'traks-yakutia-v1';
const OFFLINE_URL = '/offline.html';

const CACHE_ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/js/data.js',
  '/manifest.json'
];

// Установка
self.addEventListener('install', event => {
  console.log('[SW] Установка для ТраксЯкутия');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Кэширование основных файлов');
        return cache.addAll(CACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Активация
self.addEventListener('activate', event => {
  console.log('[SW] Активация');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Удаление старого кэша:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Перехват запросов
self.addEventListener('fetch', event => {
  // Пропускаем запросы к картографическим сервисам
  if (event.request.url.includes('tile.openstreetmap.org')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        
        return fetch(event.request)
          .then(response => {
            // Не кэшируем большие файлы или API запросы
            if (!event.request.url.includes('api') && 
                response.status === 200 &&
                response.type === 'basic') {
              const responseClone = response.clone();
              caches.open(CACHE_NAME)
                .then(cache => cache.put(event.request, responseClone));
            }
            return response;
          })
          .catch(() => {
            // Для навигационных запросов показываем оффлайн-страницу
            if (event.request.mode === 'navigate') {
              return caches.match('/');
            }
            return new Response('Нет соединения с интернетом', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});