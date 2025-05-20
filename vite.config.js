// vite.config.js - Final Working Version for Bee-js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  base: './',           // ← ensures all asset URLs are relative
  plugins: [react()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    commonjsOptions: {
      include: [/node_modules/, /@ethersphere\/bee-js/],
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return 'vendor'
          }
        },
      },
    },
  },
  resolve: {
    alias: {
      axios: 'axios/dist/axios.min.js',              // ✅ Force browser-compatible Axios
      stream: 'stream-browserify',                   // ✅ Polyfills for Bee-js
      events: 'events',
      buffer: 'buffer',
      util: 'util',
      crypto: 'crypto-browserify',
    },
  },
  define: {
    'process.env': {},                                // ✅ Avoid "process is not defined" errors
    global: 'globalThis',
  },
})
