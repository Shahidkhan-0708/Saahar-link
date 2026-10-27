import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// ADR-017: React 19 + Vite 6 + PWA. Precache app shell + (later) face model
// files; lesson packages are runtime-cached by the SW (blueprint §8).
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Sahakar-Link",
        short_name: "SahakarLink",
        description:
          "Offline-first cooperative training: learning, attendance, credentials, employment.",
        theme_color: "#0f766e",
        background_color: "#0b1220",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        navigateFallback: "/index.html",
      },
    }),
  ],
  server: { port: 5173 },
  preview: { port: 5174 },
});
