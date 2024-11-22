import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(path.dirname(import.meta.url), './src'),
    },
  },
  server: {
    proxy: {
      "/api": "http://localhost:5000", // Proxy API requests to backend
    },
  },
}); 