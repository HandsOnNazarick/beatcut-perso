// === Module Beat-sync ===
// Génère une timeline de cuts calés sur le BPM

import { getBeatTimes } from './bpm.js'

// Pour chaque beat dans la fenêtre, on prend un bout de clip (durée = 1 ou 2 beats)
// Si pas assez de clips, on boucle
export function buildBeatSyncTimeline(opts) {
  const {
    audioDuration,
    bpm,
    startTime = 0, // début de l'extrait dans le morceau
    endTime, // fin de l'extrait
    clipUrls = [], // URLs ou blobs des clips disponibles
    beatsPerCut = 2, // 1 cut par beat = rapide, 1 par 4 beats = lent
  } = opts

  const end = endTime ?? audioDuration
  const beatTimes = getBeatTimes(end - startTime, bpm, startTime)

  // On groupe les beats par groupes de beatsPerCut
  const segments = []
  for (let i = 0; i < beatTimes.length; i += beatsPerCut) {
    const t0 = beatTimes[i]
    const t1 = beatTimes[i + beatsPerCut] ?? end
    if (t0 >= end) break
    segments.push({ start: t0, end: t1 })
  }

  // Chaque segment est associé à un clip (rotation si pas assez)
  const timeline = segments.map((seg, i) => {
    const clip = clipUrls.length > 0 ? clipUrls[i % clipUrls.length] : null
    return {
      ...seg,
      duration: seg.end - seg.start,
      clipIndex: i % Math.max(clipUrls.length, 1),
      clip,
    }
  })

  return timeline
}

// Convertit la timeline en commandes ffmpeg
// Chaque segment devient une coupe + concat
export function timelineToFFmpegSegments(timeline, clipDurations = []) {
  // Pour ffmpeg.wasm : on prépare une liste de fichiers concat
  // Chaque segment aura besoin d'un fichier source vidéo + start/duration
  return timeline.map((seg, i) => ({
    inputIndex: seg.clipIndex,
    start: 0, // début dans le clip source
    duration: seg.duration,
    outputIndex: i,
  }))
}
