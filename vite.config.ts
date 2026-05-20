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
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'INVALID_ANNOTATION' && warning.id?.includes('@microsoft/signalr')) return;
        warn(warning);
      },
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('react-dom') || id.includes('/react/'))           return 'vendor-react';
          if (id.includes('recharts') || id.includes('d3-'))                return 'vendor-charts';
          if (id.includes('@microsoft/signalr'))                             return 'vendor-signalr';
          if (id.includes('lucide-react'))                                   return 'vendor-icons';
          if (id.includes('jspdf') || id.includes('html2canvas'))           return 'vendor-pdf';
          if (id.includes('@react-pdf'))                                     return 'vendor-pdf-renderer';
          if (id.includes('exceljs'))                                        return 'vendor-excel';
          if (id.includes('framer-motion'))                                  return 'vendor-motion';
        },
      },
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
            src: '/Railly_logo_192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/Railly_logo_512x512.png',
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
