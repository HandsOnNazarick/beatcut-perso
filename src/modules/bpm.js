// === Module BPM Detection ===
// Détecte le BPM d'un fichier audio avec web-audio-beat-detector
// Permet l'override manuel

import { analyze, guess } from 'web-audio-beat-detector'

export async function detectBPM(audioBuffer) {
  const bpm = await analyze(audioBuffer)
  const tempo = await guess(audioBuffer)
  return {
    bpm: Math.round(bpm),
    confidence: Math.abs(bpm - tempo) < 5 ? 'high' : 'low',
    alternative: Math.round(tempo),
  }
}

export function validateBPM(bpm) {
  const n = Number(bpm)
  if (!Number.isFinite(n)) return null
  if (n < 40 || n > 240) return null
  return Math.round(n)
}

// Calcule les positions (en secondes) des beats dans un morceau
export function getBeatTimes(durationSeconds, bpm, offsetSeconds = 0) {
  const beatInterval = 60 / bpm // secondes entre chaque beat
  const beats = []
  for (let t = offsetSeconds; t < durationSeconds; t += beatInterval) {
    beats.push(t)
  }
  return beats
}
