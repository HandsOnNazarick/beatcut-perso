// === Module OpenSubtitles API ===
// Recherche de sous-titres via l'API REST d'OpenSubtitles
// https://opensubtitles.stoplight.io/docs/opensubtitles-api
//
// IMPORTANT: OpenSubtitles a changé ses CGV en 2023.
// L'API gratuite (v1) nécessite une clé API + User-Agent identifiable.
// Alternative légale : on utilise leur endpoint REST avec une clé gratuite.
//
// Note: pour les recherches de matching de phrases, on télécharge les .srt
// localement et on les parse. Pas de streaming massif.

const OS_BASE = 'https://api.opensubtitles.com/api/v1'

export function getOSApiKey() {
  return localStorage.getItem('beatcut:os_key') || ''
}

export function setOSApiKey(key) {
  localStorage.setItem('beatcut:os_key', key)
}

export function isOSApiKeyConfigured() {
  return !!getOSApiKey()
}

/**
 * Recherche des sous-titres par ID IMDB ou par texte
 */
export async function searchSubtitles(query, languages = ['fre', 'eng']) {
  const key = getOSApiKey()
  if (!key) throw new Error('Clé OpenSubtitles manquante')

  const params = new URLSearchParams({
    query,
    languages: languages.join(','),
    type: 'movie',
  })

  const res = await fetch(`${OS_BASE}/subtitles?${params}`, {
    headers: {
      'Api-Key': key,
      'User-Agent': 'BeatCutPerso v0.1',
    },
  })

  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`OpenSubtitles ${res.status}: ${txt.slice(0, 200)}`)
  }
  return res.json()
}

/**
 * Recherche par hash de fichier (plus précis)
 */
export async function searchByHash(movieHash, languages = ['fre', 'eng']) {
  const key = getOSApiKey()
  if (!key) throw new Error('Clé OpenSubtitles manquante')

  const params = new URLSearchParams({
    moviehash: movieHash,
    languages: languages.join(','),
  })

  const res = await fetch(`${OS_BASE}/subtitles?${params}`, {
    headers: {
      'Api-Key': key,
      'User-Agent': 'BeatCutPerso v0.1',
    },
  })

  if (!res.ok) throw new Error(`OpenSubtitles ${res.status}`)
  return res.json()
}

/**
 * Télécharge le contenu d'un sous-titre
 * OpenSubtitles retourne une URL temporaire qu'on fetch directement
 */
export async function downloadSubtitle(fileId) {
  const key = getOSApiKey()
  if (!key) throw new Error('Clé OpenSubtitles manquante')

  const res = await fetch(`${OS_BASE}/download`, {
    method: 'POST',
    headers: {
      'Api-Key': key,
      'User-Agent': 'BeatCutPerso v0.1',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ file_id: fileId }),
  })

  if (!res.ok) throw new Error(`OS download ${res.status}`)
  const data = await res.json()

  // Retourne { link, file_name, requests }
  return data
}

/**
 * Parse un fichier .srt en liste de cues
 */
export function parseSRT(srtContent) {
  const cues = []
  const blocks = srtContent.trim().split(/\n\n+/)

  for (const block of blocks) {
    const lines = block.split('\n')
    if (lines.length < 3) continue

    const id = parseInt(lines[0], 10)
    const timeLine = lines[1]
    const match = timeLine.match(/(\d+):(\d+):(\d+),(\d+)\s*-->\s*(\d+):(\d+):(\d+),(\d+)/)
    if (!match) continue

    const startSec = parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseInt(match[3]) + parseInt(match[4]) / 1000
    const endSec = parseInt(match[5]) * 3600 + parseInt(match[6]) * 60 + parseInt(match[7]) + parseInt(match[8]) / 1000
    const text = lines.slice(2).join(' ').trim()

    cues.push({ id, startSec, endSec, text })
  }

  return cues
}

/**
 * Distance Levenshtein normalisée entre deux strings
 * (utilisée pour le matching de phrases)
 */
export function stringSimilarity(a, b) {
  if (!a || !b) return 0
  const aLower = a.toLowerCase().replace(/[^\w\s]/g, '')
  const bLower = b.toLowerCase().replace(/[^\w\s]/g, '')

  if (aLower === bLower) return 1

  const matrix = Array.from({ length: aLower.length + 1 }, () =>
    new Array(bLower.length + 1).fill(0)
  )

  for (let i = 0; i <= aLower.length; i++) matrix[i][0] = i
  for (let j = 0; j <= bLower.length; j++) matrix[0][j] = j

  for (let i = 1; i <= aLower.length; i++) {
    for (let j = 1; j <= bLower.length; j++) {
      const cost = aLower[i - 1] === bLower[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      )
    }
  }

  const maxLen = Math.max(aLower.length, bLower.length)
  return 1 - matrix[aLower.length][bLower.length] / maxLen
}

/**
 * Cherche la meilleure correspondance entre une phrase et une liste de cues
 * Retourne le top N avec un score minimum
 */
export function findBestMatches(queryPhrase, cues, topN = 3, minScore = 0.6) {
  return cues
    .map((cue) => ({
      ...cue,
      score: stringSimilarity(queryPhrase, cue.text),
    }))
    .filter((c) => c.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
}
