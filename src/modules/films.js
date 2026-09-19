// === Module Films (TMDB) ===
// Recherche de films via l'API The Movie Database
// Nécessite une clé API saisie par l'utilisateur (stockée en localStorage)

const TMDB_BASE = 'https://api.themoviedb.org/3'
const IMG_BASE = 'https://image.tmdb.org/t/p'

export function getApiKey() {
  return localStorage.getItem('beatcut:tmdb_key') || ''
}

export function setApiKey(key) {
  localStorage.setItem('beatcut:tmdb_key', key)
}

export function clearApiKey() {
  localStorage.removeItem('beatcut:tmdb_key')
}

export function isApiKeyConfigured() {
  return !!getApiKey()
}

export async function searchFilms(query) {
  const key = getApiKey()
  if (!key) throw new Error('Clé TMDB manquante. Configure-la dans les paramètres.')

  const url = `${TMDB_BASE}/search/movie?api_key=${key}&query=${encodeURIComponent(query)}&language=fr-FR&page=1`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`TMDB erreur ${res.status}`)
  const data = await res.json()

  return (data.results || []).slice(0, 12).map((m) => ({
    id: m.id,
    title: m.title || m.original_title,
    year: m.release_date ? new Date(m.release_date).getFullYear() : '—',
    poster: m.poster_path ? `${IMG_BASE}/w342${m.poster_path}` : null,
    overview: m.overview || '',
    genres: m.genre_ids || [],
  }))
}

export function posterUrl(path, size = 'w342') {
  return path ? `${IMG_BASE}/${size}${path}` : null
}
