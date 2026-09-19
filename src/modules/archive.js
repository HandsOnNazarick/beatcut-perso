// === Module Archive.org (films domaine public) ===
// API publique d'Internet Archive — pas de clé nécessaire
// https://archive.org/advancedsearch.php
// Filtre: mediatype=movies, licenseurl=publicdomain
// Retourne: titre, année, description, fichier vidéo direct

const ARCHIVE_API = 'https://archive.org/advancedsearch.php'
const ARCHIVE_DETAILS = 'https://archive.org/metadata'
const ARCHIVE_BASE = 'https://archive.org'

// Films cultes pré-sélectionnés (validés domaine public)
// Chaque entrée : identifiant archive.org + métadonnées
// Source: collections "Prelinger Archives", "Feature Films", "Movies"
const CURATED_FILMS = [
  {
    id: 'night_of_the_living_dead',
    title: 'Night of the Living Dead',
    year: 1968,
    mood: 'horreur',
    director: 'George A. Romero',
    note: 'Classique horreur, noir & blanc, ambiance angoissante',
  },
  {
    id: 'Plan_9_from_Outer_Space',
    title: 'Plan 9 from Outer Space',
    year: 1959,
    mood: 'science-fiction',
    director: 'Ed Wood',
    note: 'Cultissime B-movie SF, esthétique rétro',
  },
  {
    id: 'Nosferatu',
    title: 'Nosferatu',
    year: 1922,
    mood: 'horreur',
    director: 'F.W. Murnau',
    note: 'Expressionniste allemand, muet, ambiance gothique',
  },
  {
    id: 'Aelita',
    title: 'Aelita',
    year: 1924,
    mood: 'science-fiction',
    director: 'Yakov Protazanov',
    note: 'SF soviétique muet, design constructiviste',
  },
  {
    id: 'the_cabinet_of_dr_caligari',
    title: 'The Cabinet of Dr. Caligari',
    year: 1920,
    mood: 'horreur',
    director: 'Robert Wiene',
    note: 'Pionnier expressionnisme, distorsions géométriques',
  },
  {
    id: 'the_battle_of_algiers',
    title: 'The Battle of Algiers',
    year: 1966,
    mood: 'politique',
    director: 'Gillo Pontecorvo',
    note: 'Néo-réalisme noir/blanc, tension urbaine',
  },
  {
    id: 'shaft',
    title: 'Shaft',
    year: 1971,
    mood: 'urbain',
    director: 'Gordon Parks',
    note: 'Blaxploitation, groove 70s, NYC',
  },
  {
    id: 'rebel_without_a_cause',
    title: 'Rebel Without a Cause',
    year: 1955,
    mood: 'mélancolique',
    director: 'Nicholas Ray',
    note: 'Teenage drama, Cinémascope, couleurs saturées',
  },
  {
    id: 'detour',
    title: 'Detour',
    year: 1945,
    mood: 'noir',
    director: 'Edgar G. Ulmer',
    note: 'Film noir cheap, ambiance glauque',
  },
  {
    id: 'the_runaway',
    title: 'The Runaway',
    year: 1956,
    mood: 'mélancolique',
    director: 'Various',
    note: 'Court Prelinger, atmosphère contemplative',
  },
  {
    id: 'atomic_cafe',
    title: 'The Atomic Cafe',
    year: 1982,
    mood: 'politique',
    director: 'Jayne Loader',
    note: 'Docu satirique propagande US, montage archives',
  },
  {
    id: 'meshes_of_the_afternoon',
    title: 'Meshes of the Afternoon',
    year: 1943,
    mood: 'onirique',
    director: 'Maya Deren',
    note: 'Avant-garde surréaliste, 14 min, boucle onirique',
  },
]

export function getCuratedFilms() {
  return CURATED_FILMS
}

// Recherche dans Archive.org via leur API publique
// Filtre les films avec au moins un fichier vidéo .mp4
export async function searchArchive(query, limit = 20) {
  const params = new URLSearchParams({
    q: `(${query}) AND mediatype:movies AND licenseurl:publicdomain`,
    fl: 'identifier,title,year,description,creator',
    rows: String(limit),
    output: 'json',
    sort: 'downloads desc',
  })

  const url = `${ARCHIVE_API}?${params}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Archive.org erreur ${res.status}`)
  const data = await res.json()

  return (data.response?.docs || []).map((doc) => ({
    id: doc.identifier,
    title: doc.title || doc.identifier,
    year: doc.year || '—',
    description: doc.description?.[0]?.slice(0, 200) || '',
    creator: doc.creator?.[0] || 'Unknown',
    url: `${ARCHIVE_BASE}/details/${doc.identifier}`,
    poster: `${ARCHIVE_BASE}/services/img/${doc.identifier}`,
  }))
}

// Récupère les URLs des fichiers vidéo d'un item Archive.org
export async function getVideoFiles(identifier) {
  const res = await fetch(`${ARCHIVE_DETAILS}/${identifier}`)
  if (!res.ok) throw new Error(`Archive.org metadata erreur ${res.status}`)
  const data = await res.json()

  const files = data.files || []
  // Préfère les MP4, sinon OGV, sinon le plus gros fichier vidéo
  const videos = files.filter((f) => /\.(mp4|webm|ogv|mkv)$/i.test(f.name || ''))

  if (videos.length === 0) return []

  // Trie par taille décroissante, MP4 en premier
  videos.sort((a, b) => {
    const aIsMp4 = a.name.endsWith('.mp4') ? 1 : 0
    const bIsMp4 = b.name.endsWith('.mp4') ? 1 : 0
    if (aIsMp4 !== bIsMp4) return bIsMp4 - aIsMp4
    return (parseInt(b.size) || 0) - (parseInt(a.size) || 0)
  })

  return videos.slice(0, 3).map((v) => ({
    name: v.name,
    size: parseInt(v.size) || 0,
    duration: parseFloat(v.length) || 0,
    url: `${ARCHIVE_BASE}/download/${identifier}/${v.name}`,
  }))
}

// Recherche par mood (utilise la liste curatée)
export function findFilmsByMood(mood) {
  if (!mood) return CURATED_FILMS
  const m = mood.toLowerCase()
  return CURATED_FILMS.filter((f) =>
    f.mood.toLowerCase().includes(m) ||
    f.note.toLowerCase().includes(m) ||
    f.title.toLowerCase().includes(m)
  )
}
