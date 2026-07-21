const CACHE_NAME = 'health-sticker-v1';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  // 僅快取 GET 請求與同源請求
  if (e.request.method !== 'GET') return;
  
  const url = new URL(e.request.url);
  // 排除 chrome-extension 等非 http 協議
  if (!url.protocol.startsWith('http')) return;

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      const fetchPromise = fetch(e.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(e.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // 網路請求失敗時，如果快取也沒有，就返回 null
          return null;
        });

      // 優先返回快取，若無快取則返回網路請求的 Promise
      return cachedResponse || fetchPromise;
    })
  );
});

// 監聽系統桌面通知的點擊事件
self.addEventListener('notificationclick', (event) => {
  event.notification.close(); // 點選後自動關閉通知

  // 尋找已開啟的網頁視窗，若有則將其聚焦 (Focus) 並通知前台啟動休息引導
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          // 向前台發送訊息，使其啟動提醒與解鎖音訊
          client.postMessage({ action: 'notification-clicked' });
          return client.focus();
        }
      }
      // 若沒有開啟的視窗，則重新開啟首頁
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});
