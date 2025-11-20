import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // This tells Vite to use relative paths so it works on GitHub Pages
  build: {
    chunkSizeWarningLimit: 1500, // Suppress warning for large physics files
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser'],
          three: ['three'],
        },
      },
    },
  },
});
