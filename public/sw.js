// Service Worker для PWA - Автопарк CRM
const CACHE_NAME = 'car-rent-v1'
const STATIC_CACHE_NAME = 'car-rent-static-v1'
const DYNAMIC_CACHE_NAME = 'car-rent-dynamic-v1'

// Файлы для кэширования
const STATIC_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
]

// Установка Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...')
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static files')
        return cache.addAll(STATIC_FILES)
      })
      .then(() => {
        console.log('[SW] Service Worker installed')
        return self.skipWaiting()
      })
      .catch((error) => {
        console.error('[SW] Failed to cache:', error)
      })
  )
})

// Активация Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...')
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== STATIC_CACHE_NAME && name !== DYNAMIC_CACHE_NAME)
            .map((name) => {
              console.log('[SW] Deleting old cache:', name)
              return caches.delete(name)
            })
        )
      })
      .then(() => {
        console.log('[SW] Service Worker activated')
        return self.clients.claim()
      })
  )
})

// Стратегия кэширования: Network First для API, Cache First для статики
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  
  // Пропускаем не-GET запросы
  if (request.method !== 'GET') {
    return
  }
  
  // Пропускаем запросы к Supabase API (всегда свежие данные)
  if (url.hostname.includes('supabase')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Кэшируем успешные ответы
          if (response.status === 200) {
            const responseClone = response.clone()
            caches.open(DYNAMIC_CACHE_NAME)
              .then((cache) => cache.put(request, responseClone))
          }
          return response
        })
        .catch(() => {
          // Если нет сети, пробуем кэш
          return caches.match(request)
        })
    )
    return
  }
  
  // Для статических файлов - Cache First
  if (url.pathname.startsWith('/assets/') || 
      url.pathname.endsWith('.js') || 
      url.pathname.endsWith('.css') ||
      url.pathname.endsWith('.png') ||
      url.pathname.endsWith('.svg') ||
      url.pathname.endsWith('.woff') ||
      url.pathname.endsWith('.woff2')) {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse
          }
          return fetch(request)
            .then((response) => {
              if (response.status === 200) {
                const responseClone = response.clone()
                caches.open(STATIC_CACHE_NAME)
                  .then((cache) => cache.put(request, responseClone))
              }
              return response
            })
        })
    )
    return
  }
  
  // Для остальных запросов - Network First
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.status === 200) {
          const responseClone = response.clone()
          caches.open(DYNAMIC_CACHE_NAME)
            .then((cache) => cache.put(request, responseClone))
        }
        return response
      })
      .catch(() => {
        return caches.match(request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse
            }
            // Если это навигация, возвращаем index.html
            if (request.mode === 'navigate') {
              return caches.match('/index.html')
            }
            return new Response('Offline', { status: 503 })
          })
      })
  )
})

// Обработка push-уведомлений (для будущего использования)
self.addEventListener('push', (event) => {
  console.log('[SW] Push received')
  
  const options = {
    body: event.data?.text() || 'Новое уведомление',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
    },
  }
  
  event.waitUntil(
    self.registration.showNotification('Автопарк CRM', options)
  )
})

// Обработка клика по уведомлению
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked')
  event.notification.close()
  
  event.waitUntil(
    clients.openWindow('/')
  )
})
