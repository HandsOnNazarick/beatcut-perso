// === Module YouTube search ===
// Recherche de scènes de films via YouTube Data API v3
// https://developers.google.com/youtube/v3
//
// IMPORTANT: on n'utilise PAS youtube-dl côté client (illégal + bloqué)
// On génère des liens watch directs vers les timestamps trouvés.
// L'utilisateur regarde sur YouTube ou screen-record la scène.

const YT_BASE = 'https://www.googleapis.com/youtube/v3'

export function getYouTubeApiKey() {
  return localStorage.getItem('beatcut:yt_key') || ''
}

export function setYouTubeApiKey(key) {
  localStorage.setItem('beatcut:yt_key', key)
}

export function isYouTubeApiKeyConfigured() {
  return !!getYouTubeApiKey()
}

/**
 * Recherche une vidéo YouTube correspondant à "film title scene quote"
 * Retourne l'ID de la vidéo et les métadonnées
 */
export async function searchVideo(query, maxResults = 3) {
  const key = getYouTubeApiKey()
  if (!key) throw new Error('Clé YouTube manquante')

  const params = new URLSearchParams({
    part: 'snippet',
    q: query,
    type: 'video',
    maxResults: String(maxResults),
    videoEmbeddable: 'true',
    relevanceLanguage: 'fr',
    safeSearch: 'none',
    key,
  })

  const res = await fetch(`${YT_BASE}/search?${params}`)
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`YouTube ${res.status}: ${err.slice(0, 200)}`)
  }
  const data = await res.json()

  return (data.items || []).map((item) => ({
    id: item.id.videoId,
    title: item.snippet.title,
    channel: item.snippet.channelTitle,
    description: item.snippet.description,
    thumbnail: item.snippet.thumbnails?.medium?.url,
    publishedAt: item.snippet.publishedAt,
    url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
    embedUrl: `https://www.youtube.com/embed/${item.id.videoId}`,
  }))
}

/**
 * Construit une URL YouTube avec timestamp
 */
export function watchUrlWithTimestamp(videoId, seconds) {
  return `https://www.youtube.com/watch?v=${videoId}&t=${Math.floor(seconds)}s`
}

/**
 * Cherche la meilleure vidéo pour une scène donnée
 * query optimisée : "{movieTitle} {quote} scene movie"
 */
export async function findScene(movieTitle, quote, year = null) {
  const cleanQuote = quote.replace(/[^\w\s]/g, '').slice(0, 50)
  const searchQuery = `${movieTitle} ${year || ''} "${cleanQuote}" scene movie clip`.trim()
  return searchVideo(searchQuery, 1)
}
