import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://192.168.68.107:5293',
        changeOrigin: true,
      }
    }
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      includeAssets: ['favicon.ico'],
      manifest: {
        name: 'Railly',
        short_name: 'Railly',
        description: 'Real-time WOCs monitoring for operators, passengers, and auxiliary.',
        theme_color: '#1e1b4b',
        background_color: '#FAF9F5',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        scope: '/',
        categories: ['navigation', 'utilities'],
        icons: [
          {
            src: 'https://railly.s3.ap-southeast-1.amazonaws.com/assets/Railly_logo.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          }
          {
            src: 'https://railly.s3.ap-southeast-1.amazonaws.com/assets/Railly_logo.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024
      },
      devOptions: {
        enabled: true,
        type: 'module'
      }
    })
  ],
})
