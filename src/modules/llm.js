// === Module LLM (via proxy BeatCut ou OpenRouter direct) ===
// Si une URL de proxy est configurée (via ?proxy=... ou localStorage),
// toutes les requêtes passent par le proxy qui détient les clés.
// Sinon, fallback sur OpenRouter direct avec clé utilisateur.

const DEFAULT_PROXY_KEY = 'beatcut:proxy_url'

export function getProxyUrl() {
  // Priorité : URL passée en query string > localStorage
  const params = new URLSearchParams(window.location.search)
  const fromUrl = params.get('proxy')
  if (fromUrl) {
    localStorage.setItem(DEFAULT_PROXY_KEY, fromUrl)
    return fromUrl
  }
  return localStorage.getItem(DEFAULT_PROXY_KEY) || ''
}

export function setProxyUrl(url) {
  localStorage.setItem(DEFAULT_PROXY_KEY, url)
}

export function clearProxyUrl() {
  localStorage.removeItem(DEFAULT_PROXY_KEY)
}

export function isProxyMode() {
  return !!getProxyUrl()
}

export function getOpenRouterApiKey() {
  // En mode proxy, pas besoin de clé
  if (isProxyMode()) return 'proxy'
  return localStorage.getItem('beatcut:or_key') || ''
}

export function setOpenRouterApiKey(key) {
  localStorage.setItem('beatcut:or_key', key)
}

export function isOpenRouterApiKeyConfigured() {
  if (isProxyMode()) return true
  return !!getOpenRouterApiKey()
}

/**
 * Modèles gratuits (ou quasi) populaires sur OpenRouter
 */
export const FREE_MODELS = [
  {
    id: 'meta-llama/llama-3.1-8b-instruct:free',
    name: 'Llama 3.1 8B (gratuit)',
    description: 'Rapide, bon pour le tri et la sélection',
  },
  {
    id: 'mistralai/mistral-7b-instruct:free',
    name: 'Mistral 7B (gratuit)',
    description: 'Alternative française, bon pour textes FR',
  },
  {
    id: 'google/gemma-2-9b-it:free',
    name: 'Gemma 2 9B (gratuit)',
    description: 'Google, équilibré',
  },
]

export function getSelectedModel() {
  return localStorage.getItem('beatcut:or_model') || FREE_MODELS[0].id
}

export function setSelectedModel(modelId) {
  localStorage.setItem('beatcut:or_model', modelId)
}

/**
 * Appel LLM avec un prompt simple (chat completion)
 * Passe par le proxy si configuré, sinon OpenRouter direct
 */
export async function callLLM(prompt, options = {}) {
  const proxyUrl = getProxyUrl()

  if (proxyUrl) {
    // Mode proxy : on envoie tout au worker qui détient les clés
    const res = await fetch(`${proxyUrl}/llm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: options.messages || [{ role: 'user', content: prompt }],
        model: options.model,
        max_tokens: options.max_tokens || 1000,
        temperature: options.temperature ?? 0.7,
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Proxy ${res.status}: ${err.slice(0, 300)}`)
    }
    const data = await res.json()
    return data.choices?.[0]?.message?.content || ''
  }

  // Mode direct (fallback)
  const key = getOpenRouterApiKey()
  if (!key || key === 'proxy') throw new Error('Clé OpenRouter manquante (ou configure un proxy)')

  const model = options.model || getSelectedModel()

  const res = await fetch(`${OR_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-Title': 'BeatCut Perso',
    },
    body: JSON.stringify({
      model,
      messages: options.messages || [{ role: 'user', content: prompt }],
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens ?? 1000,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenRouter ${res.status}: ${err.slice(0, 300)}`)
  }

  const data = await res.json()
  return data.choices?.[0]?.message?.content || ''
}

/**
 * Sélectionne les meilleurs plans pour un beat-sync donné
 */
export async function selectBestClips(input) {
  const { lyrics, bpm, candidates } = input

  const prompt = `Tu es un directeur artistique pour clips musicaux TikTok.

Voici les paroles de la musique :
"${lyrics}"

BPM : ${bpm}

Voici des candidats de scènes de films :
${candidates.map((c, i) => `
${i + 1}. "${c.movieTitle}" (${c.year || '?'}) — Phrase : "${c.quote}"
   Timestamp : ${c.timestamp}s
   Match score : ${c.matchScore}
`).join('')}

Tâche : sélectionne les 3 à 5 scènes qui matchent le MIEUX avec le thème/l'ambiance des paroles.

Critères :
- Cohérence thématique avec les paroles
- Émotion/mood similaire
- Diversité visuelle (pas 5 scènes du même film)
- Timing adapté pour un clip TikTok (15-30s)

Réponds UNIQUEMENT avec un JSON valide (pas de markdown, pas de texte autour) :
{
  "selections": [
    { "index": 1, "reason": "Pourquoi cette scène matche" },
    ...
  ]
}`

  const response = await callLLM(prompt, {
    temperature: 0.6,
    max_tokens: 600,
  })

  // Parse le JSON (le LLM peut parfois ajouter du texte autour)
  const jsonMatch = response.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('LLM n\'a pas retourné de JSON')

  return JSON.parse(jsonMatch[0])
}

/**
 * Détecte le thème/mood global des paroles
 */
export async function detectTheme(lyrics) {
  const prompt = `Analyse les paroles suivantes et détermine :
1. Le thème principal (1-3 mots)
2. L'émotion dominante
3. 3-5 mots-clés visuels pour un clip vidéo

Paroles :
"${lyrics}"

Réponds UNIQUEMENT en JSON :
{
  "theme": "...",
  "emotion": "...",
  "visualKeywords": ["...", "...", "..."]
}`

  const response = await callLLM(prompt, {
    temperature: 0.5,
    max_tokens: 200,
  })

  const jsonMatch = response.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return {
      theme: 'mélancolique',
      emotion: 'contemplatif',
      visualKeywords: ['ville', 'nuit', 'pluie'],
    }
  }
  return JSON.parse(jsonMatch[0])
}
