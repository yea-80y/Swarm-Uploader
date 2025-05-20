// vite.config.js - Updated with Bee-JS Fix
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    commonjsOptions: {
      include: [/node_modules/, /@ethersphere\/bee-js/],
    },
    rollupOptions: {
      external: ['stream', 'buffer', 'util', 'events'],
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
  },
  server: {
    port: 5173,
  },
  resolve: {
    alias: {
      axios: 'axios/dist/axios.min.js',
      stream: 'stream-browserify',
      events: 'events',
      util: 'util',
      buffer: 'buffer',
    },
  },
  define: {
    'process.env': {},
    global: 'window',
  },
});
