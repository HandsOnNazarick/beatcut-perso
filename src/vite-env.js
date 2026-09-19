// Vite ignore list : ffmpeg.wasm utilise des workers et du code natif qui ne doivent pas être bundlés
export default {
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
  },
}
