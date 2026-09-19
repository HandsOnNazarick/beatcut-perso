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

  // Charge l'audio pour le jouer en sync
  const audioUrl = URL.createObjectURL(audioFile)
  const audioEl = new Audio(audioUrl)
  audioEl.muted = false
  audioEl.crossOrigin = 'anonymous'

  // Crée un MediaStream combiné : vidéo canvas + audio du <audio>
  // C'est la SEULE façon de capturer audio + vidéo ensemble avec MediaRecorder
  const canvasStream = canvas.captureStream(30)

  // Combine avec l'audio via Web Audio API (capture le flux audio du <audio>)
  let combinedStream = canvasStream
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    const source = audioCtx.createMediaElementSource(audioEl)
    const dest = audioCtx.createMediaStreamDestination()
    source.connect(dest)
    // Connect aussi au destination audio normal pour qu'on entende pendant le rendu
    source.connect(audioCtx.destination)

    const audioTracks = dest.stream.getAudioTracks()
    if (audioTracks.length > 0) {
      combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...audioTracks,
      ])
      addLog('✓ Audio capturé', 'success')
    } else {
      addLog('⚠ Pas de piste audio capturée', 'error')
    }
  } catch (e) {
    addLog(`⚠ Audio non capturé : ${e.message}`, 'error')
    // On continue sans audio plutôt que de tout crasher
  }

  // Configure MediaRecorder sur le stream combiné
  const mimeType = MediaRecorder.isTypeSupported('video/mp4')
    ? 'video/mp4'
    : MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm'

  const recorder = new MediaRecorder(combinedStream, {
    mimeType,
    videoBitsPerSecond: 5_000_000,
    audioBitsPerSecond: 192_000,
  })

  const chunks = []
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data)
  }

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
            // Animation cinématique plus travaillée pour les placeholders
            placeholderHue = (placeholderHue + 3) % 360
            const hue = (placeholderHue + (seg.clipIndex * 60)) % 360
            const time = (performance.now() - startTime) / 1000

            // Multi-couches pour effet cinéma
            // 1. Gradient de fond qui pulse
            const breath = Math.sin(time * 0.5 + seg.clipIndex) * 0.1 + 0.9
            const gradient = ctx.createLinearGradient(0, 0, width, height)
            gradient.addColorStop(0, `hsl(${hue}, 70%, ${22 * breath}%)`)
            gradient.addColorStop(0.5, `hsl(${(hue + 30) % 360}, 60%, ${18 * breath}%)`)
            gradient.addColorStop(1, `hsl(${(hue + 60) % 360}, 70%, ${12 * breath}%)`)
            ctx.fillStyle = gradient
            ctx.fillRect(0, 0, width, height)

            // 2. Vagues animées style "ocean" ou "dunes"
            ctx.beginPath()
            ctx.moveTo(0, height * 0.5)
            for (let x = 0; x <= width; x += 20) {
              const wave = Math.sin(x * 0.003 + time * 0.8) * 80
              const wave2 = Math.sin(x * 0.007 - time * 0.5) * 40
              ctx.lineTo(x, height * 0.5 + wave + wave2)
            }
            ctx.lineTo(width, height)
            ctx.lineTo(0, height)
            ctx.closePath()
            ctx.fillStyle = `hsla(${(hue + 180) % 360}, 70%, 35%, 0.5)`
            ctx.fill()

            // 3. Particules flottantes
            for (let p = 0; p < 30; p++) {
              const px = (Math.sin(time * 0.3 + p * 1.7) * 0.5 + 0.5) * width
              const py = (Math.cos(time * 0.4 + p * 2.3) * 0.5 + 0.5) * height * 0.7
              const ps = 2 + Math.sin(time + p) * 2
              ctx.fillStyle = `hsla(${(hue + 90) % 360}, 80%, 70%, 0.6)`
              ctx.beginPath()
              ctx.arc(px, py, ps, 0, Math.PI * 2)
              ctx.fill()
            }

            // 4. Texte indicatif discret
            ctx.font = 'bold 56px sans-serif'
            ctx.fillStyle = 'rgba(255,255,255,0.5)'
            ctx.textAlign = 'center'
            ctx.fillText(`Clip ${seg.clipIndex + 1}`, width / 2, height * 0.45)
            ctx.font = '20px sans-serif'
            ctx.fillStyle = 'rgba(255,255,255,0.3)'
            ctx.fillText('Upload tes clips dans "Mes clips" pour', width / 2, height * 0.55)
            ctx.fillText('remplacer ce placeholder', width / 2, height * 0.58)
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
  let animating = false

  function draw() {
    if (!animating) return
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

  // Crée une balise vidéo qui affiche le canvas via captureStream
  // Note : pas de properties readonly ici, on les définit comme getters simples
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.autoplay = true

  // Stocker width/height comme propriétés normales (pas Object.defineProperty)
  // pour permettre la lecture/écriture sans crash
  Object.defineProperty(video, 'videoWidth', {
    configurable: true,
    get: () => canvas.width,
  })
  Object.defineProperty(video, 'videoHeight', {
    configurable: true,
    get: () => canvas.height,
  })

  // Méthodes play/pause qui contrôlent l'animation canvas
  const originalPlay = video.play.bind(video)
  video.play = function () {
    animating = true
    draw()
    return originalPlay().catch(() => {
      // iOS peut bloquer autoplay, on s'en fout car le canvas anime déjà
      return Promise.resolve()
    })
  }
  video.pause = function () {
    animating = false
  }

  // currentTime : on le laisse comme setter natif (pas de override)
  // duration : on met une grande valeur pour ne pas stopper
  Object.defineProperty(video, 'duration', {
    configurable: true,
    get: () => 999999,
  })

  // Attache le stream du canvas comme source vidéo
  try {
    const stream = canvas.captureStream(30)
    video.srcObject = stream
  } catch (e) {
    console.warn('captureStream failed for placeholder', e)
  }

  return video
}
