import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development the Spring Boot API runs on :8080 and Vite proxies to it.
// `npm run build` writes straight into Spring Boot's static folder, so the
// backend jar serves the whole site in production.
const backend = 'http://localhost:8080';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': backend,
      '/robots.txt': backend,
      '/sitemap.xml': backend,
    },
  },
  build: {
    outDir: '../backend/src/main/resources/static',
    emptyOutDir: true,
  },
});
