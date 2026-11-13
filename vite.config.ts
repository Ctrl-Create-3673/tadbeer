import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// base './' keeps asset paths relative, so the build works on GitHub Pages under any repo name.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  test: { environment: 'node', include: ['src/**/*.test.ts'], exclude: ['**/._*', '**/node_modules/**'] },
});
