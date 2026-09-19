// === Module Export vidéo via ffmpeg.wasm ===
// Composition finale : audio + clips beat-sync → MP4 9:16

import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'

let ffmpegInstance = null
let loaded = false

export async function getFFmpeg(onLog) {
  if (ffmpegInstance && loaded) return ffmpegInstance

  ffmpegInstance = new FFmpeg()
  ffmpegInstance.on('log', ({ message }) => {
    if (onLog) onLog(message)
  })

  // Charge ffmpeg-core depuis unpkg
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd'
  await ffmpegInstance.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  })

  loaded = true
  return ffmpegInstance
}

export async function exportVideo(opts) {
  const {
    audioFile, // File ou Blob du son original
    audioStart = 0, // début de l'extrait dans le son
    audioDuration, // durée de l'extrait à exporter
    clips, // [{ url, duration }] — clips utilisés
    timeline, // [{ clipIndex, start, duration }] — segments beat-sync
    width = 1080,
    height = 1920,
    watermark = '',
    onProgress = () => {},
    onLog = () => {},
  } = opts

  onLog('Initialisation de ffmpeg...')
  const ffmpeg = await getFFmpeg(onLog)
  ffmpeg.on('progress', ({ progress }) => {
    onProgress(Math.min(100, Math.max(0, Math.round(progress * 100))))
  })

  onLog('Chargement de l\'audio...')
  await ffmpeg.writeFile('input.mp3', await fetchFile(audioFile))

  // Pour chaque clip unique, on le charge dans ffmpeg
  const uniqueClipIndexes = [...new Set(timeline.map((s) => s.clipIndex))]
  const clipFiles = {} // index → nom de fichier dans ffmpeg

  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i]
    const filename = `clip_${i}.mp4`
    onLog(`Chargement du clip ${i + 1}/${clips.length}...`)
    await ffmpeg.writeFile(filename, await fetchFile(clip.url))
    clipFiles[i] = filename
  }

  // Construction de la commande ffmpeg
  // Pour simplifier : on prend chaque segment, on crop + scale + concat
  // Approche : un filtre_complex qui scale chaque clip à 9:16 et crop, puis concat

  onLog('Construction du filtre vidéo...')

  const inputs = []
  const filters = []

  uniqueClipIndexes.forEach((idx, i) => {
    inputs.push('-i', clipFiles[idx])
    // Pour chaque clip en entrée, on prépare un stream scaled + cropped en 9:16
    filters.push(
      `[${i}:v]scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},setsar=1,fps=30[v${i}]`
    )
  })

  // Pour chaque segment, on définit le trim + concat
  const segmentLabels = []
  timeline.forEach((seg, i) => {
    const inputRef = uniqueClipIndexes.indexOf(seg.clipIndex)
    const segDuration = Math.min(seg.duration, 10) // max 10s par segment
    filters.push(
      `[${inputRef}:v]trim=start=${seg.start}:duration=${segDuration},setpts=PTS-STARTPTS,scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},setsar=1,fps=30[s${i}]`
    )
    segmentLabels.push(`[s${i}]`)
  })

  const concatFilter = `${segmentLabels.join('')}concat=n=${timeline.length}:v=1:a=0[vout]`

  // Audio : on coupe l'audio original
  const audioFilter = `[0:a]atrim=start=${audioStart}:duration=${audioDuration},asetpts=PTS-STARTPTS[aout]`

  const filterComplex = [
    ...filters,
    concatFilter,
    audioFilter,
    '[vout][aout]concat=n=1:v=1:a=1[outv][outa]',
  ].join(';')

  // Watermark si fourni
  let drawWatermark = ''
  if (watermark) {
    drawWatermark = `[outv]drawtext=text='${watermark.replace(/'/g, "\\'")}':fontcolor=white:fontsize=36:x=w-tw-20:y=h-th-20:box=1:boxcolor=black@0.5:boxborderw=8[finalv]`
  }

  onLog('Encodage en cours...')

  const args = [
    ...inputs,
    '-i', 'input.mp3',
    '-filter_complex', filterComplex + (drawWatermark ? ';' + drawWatermark : ''),
    '-map', drawWatermark ? '[finalv]' : '[outv]',
    '-map', '[outa]',
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-shortest',
    '-y', 'output.mp4',
  ]

  await ffmpeg.exec(args)

  onLog('Lecture du résultat...')
  const data = await ffmpeg.readFile('output.mp4')

  // Cleanup
  for (const f of Object.values(clipFiles)) {
    try { await ffmpeg.deleteFile(f) } catch {}
  }
  try { await ffmpeg.deleteFile('input.mp3') } catch {}
  try { await ffmpeg.deleteFile('output.mp4') } catch {}

  return new Blob([data.buffer], { type: 'video/mp4' })
}
