import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development, the React app runs on :5173 and forwards
// API / share / image / ping requests to the Express server on :5000.
const BACKEND = 'http://localhost:5000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: BACKEND, changeOrigin: true },
      '/ping': { target: BACKEND, changeOrigin: true },
      '/v': { target: BACKEND, changeOrigin: true },
      '/img': { target: BACKEND, changeOrigin: true },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    chunkSizeWarningLimit: 800,
    // Older phones (older Android WebView / Chrome) can show a blank page with
    // the default modern build, so build for an older JavaScript level.
    target: ['es2017', 'chrome64', 'safari12'],
  },
});
