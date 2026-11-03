import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' keeps every asset path relative, so the build works at
// https://<user>.github.io/<repo>/ and when opened from any other folder.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { outDir: 'dist', sourcemap: true, chunkSizeWarningLimit: 1000 },
  test: { environment: 'node', include: ['tests/**/*.test.js'], passWithNoTests: true }
});
