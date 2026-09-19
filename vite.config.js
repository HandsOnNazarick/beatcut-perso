import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/beatcut-perso/',
  server: {
    headers: {
      // Nécessaire pour SharedArrayBuffer (ffmpeg.wasm multi-threaded)
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  preview: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  optimizeDeps: {
    // ffmpeg.wasm a son propre système de workers + assets WASM, ne pas pré-bundler
    // wavesurfer.js charge des modules internes complexes, mieux en exclusion
    exclude: [
      '@ffmpeg/ffmpeg',
      '@ffmpeg/util',
      'wavesurfer.js',
    ],
  },
})
