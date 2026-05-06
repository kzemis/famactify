import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Vendor chunks let the browser cache big libraries across deploys —
    // your app-code chunk re-downloads, but Leaflet / Supabase / Embla don't.
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-leaflet':  ['leaflet'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-embla':    ['embla-carousel-react'],
          'vendor-recharts': ['recharts'],
          'vendor-tanstack': ['@tanstack/react-query'],
        },
      },
    },
    chunkSizeWarningLimit: 800,
  },
}));
