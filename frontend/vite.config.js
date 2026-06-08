import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In Docker dev the compose file sets BACKEND_URL=http://backend:4000.
// For local dev (no Docker) it falls back to localhost:4000.
const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,   // listen on 0.0.0.0 so the container is reachable
    port: 5173,
    proxy: {
      '/api':     { target: backendUrl, changeOrigin: true },
      '/uploads': { target: backendUrl, changeOrigin: true },
    },
  },
});
