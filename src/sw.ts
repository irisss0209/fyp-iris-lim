/// <reference lib="WebWorker" />
/// <reference types="vite-plugin-pwa/client" />

import { precacheAndRoute, matchPrecache } from 'workbox-precaching'
import { registerRoute, setCatchHandler } from 'workbox-routing'
import { NetworkFirst, CacheFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'

declare const self: ServiceWorkerGlobalScope

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

// ── Push notifications ─────────────────────────────────────────────────────

self.addEventListener('push', (event: PushEvent) => {
  const data = event.data?.json() ?? {}
  const title: string = data.title ?? 'Railly Alert'
  const options: NotificationOptions = {
    body: data.body ?? '',
    icon: 'https://railly.s3.ap-southeast-1.amazonaws.com/assets/Railly_logo.png',
    badge: 'https://railly.s3.ap-southeast-1.amazonaws.com/assets/Railly_logo.png',
    data: { url: data.url ?? '/' },
    tag: data.tag ?? 'railly-alert',
    renotify: true,
  }
  event.waitUntil(self.registration.showNotification(title, options))
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
