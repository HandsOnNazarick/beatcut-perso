// === Module LLM (OpenRouter) ===
// Utilise un modèle gratuit (Llama 3.1 8B) pour le tri final des plans
// OpenRouter sert de proxy multi-provider avec une seule clé API

const OR_BASE = 'https://openrouter.ai/api/v1'

export function getOpenRouterApiKey() {
  return localStorage.getItem('beatcut:or_key') || ''
}

export function setOpenRouterApiKey(key) {
  localStorage.setItem('beatcut:or_key', key)
}

export function isOpenRouterApiKeyConfigured() {
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
 */
export async function callLLM(prompt, options = {}) {
  const key = getOpenRouterApiKey()
  if (!key) throw new Error('Clé OpenRouter manquante')

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
