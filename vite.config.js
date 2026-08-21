import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// IMPORTANTE: si tu repo de GitHub Pages se llama distinto a "stockcerveza",
// cambia el "base" abajo a "/nombre-de-tu-repo/". Ver instalacion-github-firebase.md
export default defineConfig({
  base: '/stockcerveza/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'StockCerveza',
        short_name: 'StockCerveza',
        description: 'Inventario y ventas para cervezas, refrescos y botanas',
        theme_color: '#14532d',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/stockcerveza/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ]
})
