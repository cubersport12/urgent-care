import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Сборка идёт в общий dist/ в корне репозитория: лендинг занимает корень,
// вложенные папки content-builder/ и mobile-app/ дозаписываются своими сборками.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // В dev тарифы тянутся с локального бэкенда (uvicorn на 8000); в проде nginx проксирует /api сам
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
});
