import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves the site under /<repo-name>/
  base: '/Chess-Coach/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // New versions install in the background and take over on the next load.
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      // To remove the service worker from users' browsers later, set this to true and deploy.
      selfDestroying: false,
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Satranç Antrenörü',
        short_name: 'Satranç',
        description:
          'Chess.com oyunlarını Stockfish ile analiz edip kişisel alıştırmalar üreten satranç antrenörü.',
        lang: 'tr',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#020617',
        theme_color: '#020617',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // The app shell plus the Stockfish engine (≈1.8 MB wasm), so analysis, puzzles and
        // endgames work offline. Chess.com requests always go to the network.
        globPatterns: ['**/*.{js,css,html,svg,png,wasm,webmanifest}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
  },
})
