import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // Force empty base URL so MSW handlers with relative paths match.
    'import.meta.env.VITE_API_BASE_URL': JSON.stringify(''),
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.js'],
    css: false, // Tailwind classnames are static strings; no need to parse.
    testTimeout: 10_000,
  },
});
