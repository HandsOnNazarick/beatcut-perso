// === Module Stock Clips Search (Pexels + Pixabay via proxy) ===
// Recherche de clips vidéo libres de droits via API
// Le proxy télécharge le clip et le sert sans restrictions CORS

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

/**
 * Recherche des clips Pexels par mots-clés
 * @param {string} query - ex: "neon city night"
 * @param {object} options - { perPage, orientation, size }
 */
export async function searchPexels(query, options = {}) {
  const proxyUrl = getProxyUrl()
  if (!proxyUrl) throw new Error('Proxy non configuré')

  const params = new URLSearchParams({
    query,
    per_page: String(options.perPage || 20),
    page: String(options.page || 1),
    orientation: options.orientation || 'portrait', // TikTok/Reels = portrait
    size: options.size || 'medium', // small/medium/large
  })

  const res = await fetch(`${proxyUrl}/pexels/search?${params}`)
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Pexels ${res.status}: ${err.slice(0, 200)}`)
  }
  return res.json()
}

/**
 * Recherche des clips Pixabay par mots-clés
 */
export async function searchPixabay(query, options = {}) {
  const proxyUrl = getProxyUrl()
  if (!proxyUrl) throw new Error('Proxy non configuré')

  const params = new URLSearchParams({
    q: query,
    per_page: String(options.perPage || 20),
    page: String(options.page || 1),
    video_type: 'film', // film vs animation vs all
    min_width: '720',
  })

  const res = await fetch(`${proxyUrl}/pixabay/search?${params}`)
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Pixabay ${res.status}: ${err.slice(0, 200)}`)
  }
  return res.json()
}

/**
 * Recherche unifiée sur les deux sources
 */
export async function searchAllSources(query, options = {}) {
  const results = await Promise.allSettled([
    searchPexels(query, options),
    searchPixabay(query, options),
  ])

  const clips = []

  if (results[0].status === 'fulfilled') {
    const pexelsClips = (results[0].value.videos || []).map((v) => ({
      id: `pexels-${v.id}`,
      title: v.url.split('/').pop().replace(/[-_]/g, ' '),
      url: v.video_files?.[0]?.link || '',
      thumbnail: v.image,
      duration: v.duration,
      width: v.width,
      height: v.height,
      source: 'Pexels',
      tags: v.tags || [],
      originalUrl: v.url,
    }))
    clips.push(...pexelsClips)
  }

  if (results[1].status === 'fulfilled') {
    const pixabayClips = (results[1].value.hits || []).map((v) => ({
      id: `pixabay-${v.id}`,
      title: v.tags.split(',').slice(0, 3).join(' / '),
      url: v.videos?.medium?.url || v.videos?.large?.url || v.videos?.small?.url,
      thumbnail: v.userImageURL,
      duration: v.duration,
      width: v.videos?.medium?.width,
      height: v.videos?.medium?.height,
      source: 'Pixabay',
      tags: v.tags.split(','),
      originalUrl: v.pageURL,
    }))
    clips.push(...pixabayClips)
  }

  return clips
}

/**
 * Ajoute un clip au "clipboard" local de l'utilisateur (download + cache)
 * Retourne un Blob URL utilisable comme <video src>
 */
export async function addClipToLocal(clip) {
  const proxyUrl = getProxyUrl()

  // Si déjà en cache localStorage, on récupère
  const cached = localStorage.getItem(`beatcut:clip:${clip.id}`)
  if (cached) {
    try {
      const { blob, type } = JSON.parse(cached)
      // Reconstruct blob from base64
      const byteString = atob(blob)
      const ab = new ArrayBuffer(byteString.length)
      const ia = new Uint8Array(ab)
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i)
      }
      const bob = new Blob([ab], { type })
      return URL.createObjectURL(bob)
    } catch (e) {
      console.warn('Cache corrupted for', clip.id, e)
      localStorage.removeItem(`beatcut:clip:${clip.id}`)
    }
  }

  // Sinon, download via proxy (qui télécharge depuis Pexels/Pixabay)
  // Note: localStorage a une limite de ~5-10 Mo par item, donc pour les gros clips
  // on garde juste l'URL proxy qui re-fetch à chaque fois
  return `${proxyUrl}/proxy/download?url=${encodeURIComponent(clip.url)}`
}

/**
 * Liste les clips ajoutés au clipboard local de l'utilisateur
 */
export function getLocalClips() {
  const stored = localStorage.getItem('beatcut:local_clips')
  return stored ? JSON.parse(stored) : []
}

export function saveLocalClip(clip) {
  const clips = getLocalClips()
  if (!clips.some((c) => c.id === clip.id)) {
    clips.push(clip)
    localStorage.setItem('beatcut:local_clips', JSON.stringify(clips))
  }
}

export function removeLocalClip(clipId) {
  const clips = getLocalClips().filter((c) => c.id !== clipId)
  localStorage.setItem('beatcut:local_clips', JSON.stringify(clips))
}
