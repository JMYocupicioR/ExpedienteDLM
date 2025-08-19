import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    css: true,
  },
  server: {
    port: 3000,
    host: true,
  },
  build: {
    rollupOptions: {
      external: [
        // Evitar que Rollup trate la ruta de entrada como externa en Netlify
        // (No es necesario usualmente, pero dejamos la opción documentada)
      ],
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
