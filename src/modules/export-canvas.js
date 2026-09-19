// === Export basique via Canvas + MediaRecorder ===
// Fallback pour iOS Safari où ffmpeg.wasm ne marche pas
// Qualité moindre (WebM/MP4 selon navigateur) mais compatible partout

export async function exportVideoCanvas(opts) {
  const {
    audioFile,
    audioStart = 0,
    audioDuration,
    clips, // [{ url, duration }]
    timeline, // [{ clipIndex, start, duration }]
    width = 1080,
    height = 1920,
    watermark = '',
    onProgress = () => {},
    onLog = () => {},
  } = opts

  onLog('Initialisation Canvas (méthode compatible)...')

  // Crée un canvas offscreen pour composer
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')

  // Charge tous les clips vidéo en parallèle
  onLog(`Chargement de ${clips.length} clips...`)
  const videoElements = await Promise.all(
    clips.map((clip, i) => {
      return new Promise((resolve, reject) => {
        const v = document.createElement('video')
        v.src = clip.url
        v.crossOrigin = 'anonymous'
        v.muted = true
        v.playsInline = true
        v.preload = 'auto'
        v.onloadedmetadata = () => {
          onLog(`Clip ${i + 1}: ${v.videoWidth}x${v.videoHeight}, ${v.duration.toFixed(1)}s`)
          resolve(v)
        }
        v.onerror = () => reject(new Error(`Impossible de charger le clip ${i + 1}`))
      })
    })
  )

  // Configure MediaRecorder sur le canvas
  const stream = canvas.captureStream(30)
  const mimeType = MediaRecorder.isTypeSupported('video/mp4')
    ? 'video/mp4'
    : MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm'

  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 5_000_000,
  })

  const chunks = []
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data)
  }

  // Charge l'audio pour le jouer en sync
  const audioUrl = URL.createObjectURL(audioFile)
  const audioEl = new Audio(audioUrl)
  audioEl.muted = false

  // Calcule le temps total
  const totalDuration = timeline.reduce((sum, seg) => sum + seg.duration, 0)
  onLog(`Durée totale : ${totalDuration.toFixed(1)}s`)

  return new Promise((resolve, reject) => {
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType })
      URL.revokeObjectURL(audioUrl)
      onLog(`✓ Export terminé (${(blob.size / 1024 / 1024).toFixed(1)} Mo)`, 'success')
      resolve(blob)
    }

    recorder.onerror = (e) => reject(new Error(`Erreur MediaRecorder: ${e.message}`))

    recorder.start(100)
    audioEl.currentTime = audioStart
    audioEl.play().then(() => {
      onLog('Rendu en cours...')
      let segmentIndex = 0
      let startTime = performance.now()

      function drawSegment() {
        if (segmentIndex >= timeline.length) {
          // Terminé
          audioEl.pause()
          recorder.stop()
          return
        }

        const seg = timeline[segmentIndex]
        const video = videoElements[seg.clipIndex]
        const segStart = performance.now()

        // Joue le clip vidéo depuis le bon offset
        video.currentTime = seg.start
        video.play().catch(() => {})

        function drawFrame() {
          if (!video.paused && !video.ended && video.currentTime >= seg.start + seg.duration) {
            video.pause()
            segmentIndex++
            const progress = (segmentIndex / timeline.length) * 100
            onProgress(Math.round(progress))
            drawSegment()
            return
          }

          // Dessine le clip vidéo redimensionné (cover)
          ctx.fillStyle = '#000'
          ctx.fillRect(0, 0, width, height)

          const vw = video.videoWidth || 1920
          const vh = video.videoHeight || 1080
          const scale = Math.max(width / vw, height / vh)
          const dw = vw * scale
          const dh = vh * scale
          const dx = (width - dw) / 2
          const dy = (height - dh) / 2
          try {
            ctx.drawImage(video, dx, dy, dw, dh)
          } catch (e) {
            // Clip pas encore prêt
          }

          // Watermark
          if (watermark) {
            ctx.font = 'bold 36px sans-serif'
            ctx.fillStyle = 'rgba(0,0,0,0.5)'
            const text = watermark
            const metrics = ctx.measureText(text)
            ctx.fillRect(width - metrics.width - 30, height - 60, metrics.width + 20, 40)
            ctx.fillStyle = 'white'
            ctx.fillText(text, width - metrics.width - 20, height - 32)
          }

          if (audioEl.ended && segmentIndex === timeline.length - 1) {
            // Audio fini avant la vidéo
          }

          requestAnimationFrame(drawFrame)
        }

        drawFrame()
      }

      drawSegment()
    }).catch((e) => {
      reject(new Error(`Impossible de jouer l'audio: ${e.message}`))
    })
  })
}
