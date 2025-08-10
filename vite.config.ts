import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true
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
