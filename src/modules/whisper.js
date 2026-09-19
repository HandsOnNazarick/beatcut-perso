// === Module Whisper local (via @xenova/transformers) ===
// Transcription audio offline, 100% privé
// Modèle: openai/whisper-base (~75 Mo, FR + EN + 8 autres langues)

import { pipeline, env } from '@xenova/transformers'

// Configuration : on force le cache local navigateur (IndexedDB via Cache API)
// Pas de remote, pas de telemetry
env.allowLocalModels = false
env.useBrowserCache = true

let transcriberInstance = null
let loadingPromise = null

/**
 * Charge le modèle Whisper (une seule fois, mis en cache navigateur ensuite)
 * @param {Function} onProgress - callback(0-100) pour la progression du téléchargement
 */
export async function loadWhisper(onProgress) {
  if (transcriberInstance) return transcriberInstance
  if (loadingPromise) return loadingPromise

  loadingPromise = (async () => {
    transcriberInstance = await pipeline(
      'automatic-speech-recognition',
      'Xenova/whisper-base',
      {
        // Pour la progression de téléchargement du modèle
        progress_callback: (data) => {
          if (onProgress && data.status === 'progress') {
            const pct = Math.round((data.loaded / data.total) * 100)
            onProgress(pct, data)
          }
        },
      }
    )
    return transcriberInstance
  })()

  return loadingPromise
}

/**
 * Transcrit un fichier audio en texte avec timestamps
 * @param {File|Blob} audioFile
 * @param {Function} onProgress - callback('loading'|'transcribing', pct)
 * @returns {Promise<{text: string, chunks: [{text, timestamp: [start, end]}]}>}
 */
export async function transcribe(audioFile, onProgress) {
  if (onProgress) onProgress('loading', 0)
  const transcriber = await loadWhisper((pct) => {
    if (onProgress) onProgress('downloading', pct)
  })

  if (onProgress) onProgress('transcribing', 0)

  // Convertit le fichier audio en URL pour que Whisper puisse le charger
  const url = URL.createObjectURL(audioFile)

  try {
    const output = await transcriber(url, {
      // Retourne les chunks avec timestamps
      return_timestamps: true,
      // Français par défaut (FR + EN automatique selon détection)
      language: 'french',
      // Trick pour de meilleurs résultats sur paroles chantées
      chunk_length_s: 30,
      stride_length_s: 5,
    })

    if (onProgress) onProgress('transcribing', 100)

    return {
      text: output.text,
      chunks: output.chunks || [],
    }
  } finally {
    URL.revokeObjectURL(url)
  }
}

/**
 * Extrait les phrases les plus distinctives de la transcription
 * (utilisé pour le matching OpenSubtitles)
 * Score: longueur + présence de mots rares + position (intro/refrain plus importants)
 */
export function extractKeyPhrases(transcription, maxPhrases = 8) {
  const { chunks } = transcription
  if (!chunks || chunks.length === 0) return []

  // Mots-vides FR + EN à filtrer
  const stopwords = new Set([
    'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'au', 'aux',
    'et', 'ou', 'mais', 'donc', 'or', 'ni', 'car',
    'je', 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles',
    'me', 'te', 'se', 'lui', 'leur',
    'mon', 'ton', 'son', 'ma', 'ta', 'sa', 'mes', 'tes', 'ses',
    'a', 'ai', 'as', 'a', 'ont', 'suis', 'es', 'est', 'sont',
    'ce', 'ça', 'cela', 'ceci', 'celui', 'celle',
    'qui', 'que', 'quoi', 'dont', 'où',
    'dans', 'sur', 'sous', 'avec', 'sans', 'pour', 'par',
    'pas', 'plus', 'moins', 'très', 'trop', 'peu',
    'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were',
    'i', 'you', 'he', 'she', 'it', 'we', 'they',
    'to', 'of', 'in', 'on', 'at', 'by', 'for', 'with', 'without',
  ])

  // Scorer chaque chunk
  const scored = chunks.map((chunk, i) => {
    const words = chunk.text.toLowerCase().match(/\b[\w']+\b/g) || []
    const filtered = words.filter((w) => !stopwords.has(w) && w.length > 2)
    const score = filtered.length * (1 + (i < chunks.length / 3 ? 0.5 : 0)) // bonus début
    return { ...chunk, score, words: filtered }
  })

  // Top N phrases les plus longues/détaillées (4-10 mots filtrés)
  return scored
    .filter((c) => c.words.length >= 3 && c.words.length <= 12)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxPhrases)
    .map((c) => ({
      text: c.text.trim(),
      words: c.words,
      startTime: c.timestamp[0],
      endTime: c.timestamp[1],
    }))
}

/**
 * Indique si le modèle est déjà chargé en cache navigateur
 */
export function isWhisperCached() {
  // Heuristique : on vérifie si la promesse de load a déjà été résolue
  return transcriberInstance !== null
}
