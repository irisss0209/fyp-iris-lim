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

setCatchHandler(async ({ event }) => {
  if ((event as FetchEvent).request.destination === 'document') {
    return (await matchPrecache('/offline.html')) ?? Response.error()
  }
  return Response.error()
})


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
    const tx = db.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    const getReq = store.getAll();
    getReq.onsuccess = () => {
      const rows = getReq.result as any[];
      rows.forEach(r => store.delete(r.id));
      tx.oncomplete = () => resolve(rows);
      tx.onerror = () => reject(tx.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });

  if (reports.length === 0) { db.close(); return; }

  const apiBase = import.meta.env.VITE_API_BASE as string;
  const requeue: any[] = [];

  for (const report of reports) {
    try {
      const res = await fetch(`${apiBase}/api/data/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report.payload),
        credentials: 'include',
      });
      if (!res.ok) { requeue.push(report); continue; }

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
    } catch {
      requeue.push(report);
      for (let i = reports.indexOf(report) + 1; i < reports.length; i++) requeue.push(reports[i]);
      break;
    }
  }

  if (requeue.length > 0) {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      requeue.forEach(r => tx.objectStore(IDB_STORE).put(r));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  db.close();
}

self.addEventListener('sync', (event: Event) => {
  if ((event as any).tag === 'flush-reports') {
    (event as any).waitUntil(flushQueuedReports());
  }
});


self.addEventListener('push', (event: PushEvent) => {
  let data: { title?: unknown; body?: unknown; url?: unknown; tag?: unknown } = {}
  try { data = event.data?.json() ?? {} } catch { /* malformed payload — use defaults */ }
  const title = typeof data.title === 'string' ? data.title : 'Railly Alert'
  const options = {
    body: typeof data.body === 'string' ? data.body : '',
    icon: '/Railly_logo.png',
    badge: '/Railly_logo.png',
    data: { url: typeof data.url === 'string' ? data.url : '/' },
    tag: typeof data.tag === 'string' ? data.tag : 'railly-alert',
    renotify: true,
  } as NotificationOptions
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
