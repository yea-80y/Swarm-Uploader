// vite.config.js — Bee-JS + PCD UI
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './',
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
          if (id.includes('node_modules')) return 'vendor'
        }
      }
    }
  },
  resolve: {
    alias: {
      // browser shims for Node core used by bee-js / PCD libs
      stream: 'stream-browserify',
      events: 'events',
      buffer: 'buffer',
      util: 'util',
      crypto: 'crypto-browserify',
      // if you rely on axios:
      axios: 'axios/dist/axios.min.js'
      // // if anything imports 'path' on client, optionally add:
      // path: 'path-browserify'
    }
  },
  define: {
    global: 'globalThis',
    'process.env': {}
  },
  optimizeDeps: {
    include: ['buffer', 'process']
  }
})
