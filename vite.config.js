import { defineConfig } from 'vite';

export default defineConfig({
  // Use relative paths so Capacitor can load assets from the APK
  base: './',

  build: {
    outDir:    'dist',
    assetsDir: 'assets',

    // Keep Phaser in its own chunk for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser'],
        },
      },
    },

    // Increase chunk warning limit (Phaser is ~1 MB)
    chunkSizeWarningLimit: 2048,
  },

  server: {
    port: 3000,
    // Allow access from mobile devices on the same network
    host: '0.0.0.0',
  },
});
