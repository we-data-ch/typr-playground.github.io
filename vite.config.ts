import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/typr-playground.github.io/',
  plugins: [react()],
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  optimizeDeps: {
    exclude: ['webr'],
  },
  build: {
    rollupOptions: {
      // Don't try to bundle the WASM module - it's loaded at runtime
      external: [/^\/wasm\//],
    },
  },
})
