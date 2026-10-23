import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    preserveSymlinks: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        expense: fileURLToPath(new URL('./expense.html', import.meta.url)),
        admin: fileURLToPath(new URL('./admin.html', import.meta.url)),
        auth: fileURLToPath(new URL('./auth.html', import.meta.url)),
        authCallback: fileURLToPath(new URL('./auth-callback.html', import.meta.url)),
        resetPassword: fileURLToPath(new URL('./reset-password.html', import.meta.url)),
      },
    },
  },
});
