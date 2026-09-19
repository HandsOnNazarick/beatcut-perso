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
    // @xenova/transformers (Whisper) utilise des ONNX Runtime workers, ne pas bundler
    exclude: [
      '@ffmpeg/ffmpeg',
      '@ffmpeg/util',
      'wavesurfer.js',
      '@xenova/transformers',
      'onnxruntime-web',
    ],
  },
  worker: {
    format: 'es',
  },
  build: {
    // Code-split les modules lourds pour ne pas alourdir le bundle principal
    rollupOptions: {
      output: {
        manualChunks: {
          // Whisper et ONNX isolés dans un chunk séparé (chargé uniquement quand l'IA est activée)
          'whisper': ['@xenova/transformers', 'onnxruntime-web'],
        },
      },
    },
    chunkSizeWarningLimit: 1500, // 1.5 MB avant warning
  },
})
