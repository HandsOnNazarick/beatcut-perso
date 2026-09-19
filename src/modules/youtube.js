// === Module YouTube search (via proxy ou direct) ===

const YT_BASE = 'https://www.googleapis.com/youtube/v3'
const PROXY_KEY = 'beatcut:proxy_url'

export function getProxyUrl() {
  const params = new URLSearchParams(window.location.search)
  const fromUrl = params.get('proxy')
  if (fromUrl) {
    localStorage.setItem(PROXY_KEY, fromUrl)
    return fromUrl
  }
  return localStorage.getItem(PROXY_KEY) || ''
}

export function getYouTubeApiKey() {
  if (getProxyUrl()) return 'proxy'
  return localStorage.getItem('beatcut:yt_key') || ''
}

export function setYouTubeApiKey(key) {
  localStorage.setItem('beatcut:yt_key', key)
}

export function isYouTubeApiKeyConfigured() {
  if (getProxyUrl()) return true
  return !!getYouTubeApiKey()
}

/**
 * Recherche une vidéo YouTube
 * Passe par le proxy si configuré
 */
export async function searchVideo(query, maxResults = 3) {
  const proxyUrl = getProxyUrl()

  if (proxyUrl) {
    const params = new URLSearchParams({
      query,
      maxResults: String(maxResults),
    })
    const res = await fetch(`${proxyUrl}/youtube?${params}`)
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Proxy YouTube ${res.status}: ${err.slice(0, 200)}`)
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

  const key = getYouTubeApiKey()
  if (!key || key === 'proxy') throw new Error('Clé YouTube manquante (ou configure un proxy)')

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
