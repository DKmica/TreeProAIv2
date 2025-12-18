import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup/setup.ts'],
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        'dist/',
        '*.config.{ts,js}',
        'backend/',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '@components': path.resolve(__dirname, './components'),
      '@pages': path.resolve(__dirname, './pages'),
      '@hooks': path.resolve(__dirname, './hooks'),
      '@services': path.resolve(__dirname, './services'),
      '@utils': path.resolve(__dirname, './utils'),
      '@assets': path.resolve(__dirname, './attached_assets'),
    },
  },
});
