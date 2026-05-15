/// <reference lib="WebWorker" />
/// <reference types="vite-plugin-pwa/client" />

import { skipWaiting, clientsClaim } from 'workbox-core'
import { precacheAndRoute, matchPrecache } from 'workbox-precaching'
import { registerRoute, setCatchHandler } from 'workbox-routing'
import { NetworkFirst, CacheFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'

declare const self: ServiceWorkerGlobalScope

skipWaiting()
clientsClaim()

precacheAndRoute(self.__WB_MANIFEST)

// API reads — serve last cached response when offline
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/data'),
  new NetworkFirst({
    cacheName: 'api-reads-cache',
    networkTimeoutSeconds: 4,
    plugins: [
      new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 60 * 5 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
)

// Google Fonts
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new CacheFirst({
    cacheName: 'google-fonts-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
)

registerRoute(
  ({ url }) => url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'gstatic-fonts-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
)

// S3 assets (app icons, images) — cache for 30 days so they work offline
registerRoute(
  ({ url }) => url.hostname === 'railly.s3.ap-southeast-1.amazonaws.com',
  new CacheFirst({
    cacheName: 's3-assets-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 30 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
)

// Offline fallback — serve /offline.html for any uncached navigation request
setCatchHandler(async ({ event }) => {
  if ((event as FetchEvent).request.destination === 'document') {
    return (await matchPrecache('/offline.html')) ?? Response.error()
  }
  return Response.error()
})

// ── Background Sync — flush queued offline reports ─────────────────────────

const IDB_NAME = 'railly-offline';
const IDB_STORE = 'pending-reports';

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = self.indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE, { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function flushQueuedReports(): Promise<void> {
  const db = await openIDB();
  const reports: any[] = await new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  const apiBase = import.meta.env.VITE_API_BASE as string;

  for (const report of reports) {
    try {
      const res = await fetch(`${apiBase}/api/data/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report.payload),
        credentials: 'include',
      });
      if (!res.ok) continue;

      const { reportId } = await res.json().catch(() => ({}));

      if (report.photoData && report.photoMime && reportId) {
        try {
          const binary = atob(report.photoData);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          const blob = new Blob([bytes], { type: report.photoMime });
          const form = new FormData();
          form.append('image', blob, 'photo.jpg');
          await fetch(`${apiBase}/api/data/report/${reportId}/image`, {
            method: 'POST', body: form, credentials: 'include',
          });
        } catch { /* photo upload failure is non-fatal */ }
      }

      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).delete(report.id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      break; // still offline
    }
  }
  db.close();
}

self.addEventListener('sync', (event: Event) => {
  if ((event as any).tag === 'flush-reports') {
    (event as any).waitUntil(flushQueuedReports());
  }
});

// ── Push notifications ─────────────────────────────────────────────────────

self.addEventListener('push', (event: PushEvent) => {
  let data: { title?: unknown; body?: unknown; url?: unknown; tag?: unknown } = {}
  try { data = event.data?.json() ?? {} } catch { /* malformed payload — use defaults */ }
  const title = typeof data.title === 'string' ? data.title : 'Railly Alert'
  const options: NotificationOptions = {
    body: typeof data.body === 'string' ? data.body : '',
    icon: '/Railly_logo.png',
    badge: '/Railly_logo.png',
    data: { url: typeof data.url === 'string' ? data.url : '/' },
    tag: typeof data.tag === 'string' ? data.tag : 'railly-alert',
    renotify: true,
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if (event.data?.type !== 'CLEAR_SENSITIVE_CACHES') return
  event.waitUntil(
    Promise.all([
      caches.delete('api-reads-cache'),
      openIDB().then(db => new Promise<void>((resolve) => {
        const tx = db.transaction(IDB_STORE, 'readwrite')
        tx.objectStore(IDB_STORE).clear()
        tx.oncomplete = () => { db.close(); resolve() }
        tx.onerror = () => { db.close(); resolve() }
      })).catch(() => { })
    ])
  )
})

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()
  const url: string = event.notification.data?.url ?? '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      const existing = clientList.find(c => c.url.includes(url))
      if (existing) return existing.focus()
      return self.clients.openWindow(url)
    })
  )
})
