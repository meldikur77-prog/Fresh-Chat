import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: "Fresh Chat",
        short_name: "FreshChat",
        description: "A location-based messenger app connecting you with people nearby using GPS.",
        theme_color: "#10b981",
        background_color: "#f0fdf4",
        display: "fullscreen",
        start_url: "/",
        orientation: "portrait",
        icons: [
          {
            src: "https://cdn-icons-png.flaticon.com/512/1041/1041916.png",
            type: "image/png",
            sizes: "192x192",
            purpose: "any"
          },
          {
            src: "https://cdn-icons-png.flaticon.com/512/1041/1041916.png",
            type: "image/png",
            sizes: "512x512",
            purpose: "any"
          },
          {
            src: "https://cdn-icons-png.flaticon.com/512/1041/1041916.png",
            type: "image/png",
            sizes: "512x512",
            purpose: "maskable"
          }
        ]
      }
    })
  ],
  build: {
    outDir: 'dist',
    sourcemap: false
  }
})