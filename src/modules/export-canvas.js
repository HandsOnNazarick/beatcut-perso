// === Export basique via Canvas + MediaRecorder ===
// Fallback pour iOS Safari où ffmpeg.wasm ne marche pas
// Qualité moindre (WebM/MP4 selon navigateur) mais compatible partout

// Proxys CORS gratuits pour contourner les restrictions Pexels sur iOS
// En cas d'échec de chargement direct, on essaie via un proxy
const CORS_PROXIES = [
  '', // direct (fonctionne sur desktop)
  'https://corsproxy.io/?',
  'https://api.allorigins.win/raw?url=',
]

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

  // Charge tous les clips vidéo avec retry via proxy CORS si nécessaire
  onLog(`Chargement de ${clips.length} clip(s)...`)
  const videoElements = []

  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i]
    let loadedVideo = null
    let lastError = null

    // Essaie plusieurs stratégies de chargement
    for (const proxy of CORS_PROXIES) {
      try {
        const videoUrl = proxy ? proxy + encodeURIComponent(clip.url) : clip.url
        loadedVideo = await loadVideoElement(videoUrl, proxy ? 'anonymous' : null)
        // Si succès, garde ce clip
        videoElements.push({ url: clip.url, video: loadedVideo })
        onLog(`✓ Clip ${i + 1}/${clips.length} chargé`, 'success')
        break
      } catch (e) {
        lastError = e
        // Continue avec le prochain proxy
      }
    }

    if (!videoElements[i]) {
      // Aucun proxy n'a marché : on crée un clip dégradé (gradient animé)
      onLog(`⚠ Clip ${i + 1} : utilise placeholder dégradé (CORS bloqué)`, 'error')
      videoElements.push({
        url: clip.url,
        video: createPlaceholderVideo(clip),
        isPlaceholder: true,
      })
    }
  }

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
      let placeholderHue = 0

      function drawSegment() {
        if (segmentIndex >= timeline.length) {
          audioEl.pause()
          recorder.stop()
          return
        }

        const seg = timeline[segmentIndex]
        const videoEntry = videoElements[seg.clipIndex] || videoElements[0]
        const video = videoEntry.video
        const segStart = performance.now()

        // Si c'est un placeholder, on joue une animation
        if (videoEntry.isPlaceholder) {
          video.currentTime = 0
          video.play().catch(() => {})
        } else {
          video.currentTime = seg.start
          video.play().catch(() => {})
        }

        function drawFrame() {
          // Vérifie si on doit passer au segment suivant
          const elapsed = (performance.now() - segStart) / 1000
          if (elapsed >= seg.duration) {
            video.pause()
            segmentIndex++
            const progress = (segmentIndex / timeline.length) * 100
            onProgress(Math.round(progress))
            drawSegment()
            return
          }

          // Fond noir
          ctx.fillStyle = '#000'
          ctx.fillRect(0, 0, width, height)

          if (videoEntry.isPlaceholder) {
            // Animation dégradée basée sur le hash du clip
            placeholderHue = (placeholderHue + 3) % 360
            const hue = (placeholderHue + (seg.clipIndex * 60)) % 360
            const gradient = ctx.createLinearGradient(0, 0, width, height)
            gradient.addColorStop(0, `hsl(${hue}, 70%, 30%)`)
            gradient.addColorStop(0.5, `hsl(${(hue + 30) % 360}, 70%, 20%)`)
            gradient.addColorStop(1, `hsl(${(hue + 60) % 360}, 70%, 10%)`)
            ctx.fillStyle = gradient
            ctx.fillRect(0, 0, width, height)

            // Texte indicatif
            ctx.font = 'bold 48px sans-serif'
            ctx.fillStyle = 'rgba(255,255,255,0.4)'
            ctx.textAlign = 'center'
            ctx.fillText(`Clip ${seg.clipIndex + 1}`, width / 2, height / 2)
            ctx.font = '24px sans-serif'
            ctx.fillText('(CORS bloqué — placeholder)', width / 2, height / 2 + 60)
          } else if (video.videoWidth > 0) {
            // Dessine le clip vidéo redimensionné (cover)
            const vw = video.videoWidth
            const vh = video.videoHeight
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
          }

          // Watermark
          if (watermark) {
            ctx.font = 'bold 36px sans-serif'
            const text = watermark
            const metrics = ctx.measureText(text)
            ctx.fillStyle = 'rgba(0,0,0,0.5)'
            ctx.fillRect(width - metrics.width - 30, height - 60, metrics.width + 20, 40)
            ctx.fillStyle = 'white'
            ctx.fillText(text, width - metrics.width - 20, height - 32)
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

function loadVideoElement(url, crossOrigin) {
  return new Promise((resolve, reject) => {
    const v = document.createElement('video')
    v.src = url
    v.muted = true
    v.playsInline = true
    v.preload = 'auto'
    if (crossOrigin) v.crossOrigin = crossOrigin

    let timeout = setTimeout(() => {
      v.src = ''
      reject(new Error('Timeout (15s)'))
    }, 15000)

    v.onloadedmetadata = () => {
      clearTimeout(timeout)
      resolve(v)
    }
    v.onerror = () => {
      clearTimeout(timeout)
      v.src = ''
      reject(new Error('Erreur de chargement'))
    }
  })
}

function createPlaceholderVideo(clip) {
  // Crée un canvas "vidéo" qui boucle en tant que placeholder
  const canvas = document.createElement('canvas')
  canvas.width = 1080
  canvas.height = 1920
  const ctx = canvas.getContext('2d')

  let hue = 0
  let frame = 0

  function draw() {
    hue = (hue + 2) % 360
    frame++

    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
    gradient.addColorStop(0, `hsl(${hue}, 60%, 25%)`)
    gradient.addColorStop(1, `hsl(${(hue + 60) % 360}, 60%, 15%)`)
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Animation vague
    const t = frame * 0.02
    ctx.beginPath()
    ctx.moveTo(0, canvas.height * 0.6)
    for (let x = 0; x <= canvas.width; x += 10) {
      const y = canvas.height * 0.6 + Math.sin(x * 0.005 + t) * 50
      ctx.lineTo(x, y)
    }
    ctx.lineTo(canvas.width, canvas.height)
    ctx.lineTo(0, canvas.height)
    ctx.closePath()
    ctx.fillStyle = `hsla(${(hue + 180) % 360}, 70%, 40%, 0.4)`
    ctx.fill()

    requestAnimationFrame(draw)
  }

  draw()

  // Utilise captureStream pour le transformer en vidéo
  const stream = canvas.captureStream(30)
  const video = document.createElement('video')
  video.srcObject = stream
  video.muted = true
  video.playsInline = true
  video.duration = 999999 // durée indéterminée

  // Hack pour que ça marche comme une vidéo
  Object.defineProperty(video, 'videoWidth', { get: () => canvas.width })
  Object.defineProperty(video, 'videoHeight', { get: () => canvas.height })

  // Méthode de lecture manuelle
  video.play = () => Promise.resolve()
  video.pause = () => {}
  video.currentTime = 0

  return video
}
