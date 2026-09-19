// === Module Clips (banque par défaut) ===
// Clips vidéo libres de droits depuis Pexels + archive.org
// L'utilisateur peut aussi uploader ses propres clips

// Banque de démarrage : clips Pexels (libres de droits, CC0)
const STARTER_CLIPS = [
  {
    id: 'pexels-1',
    title: 'Ville de nuit',
    url: 'https://videos.pexels.com/video-files/852400/852400-hd_1920_1080_30fps.mp4',
    duration: 10,
    mood: 'nuit',
    source: 'Pexels',
  },
  {
    id: 'pexels-2',
    title: 'Plage coucher de soleil',
    url: 'https://videos.pexels.com/video-files/857195/857195-hd_1920_1080_30fps.mp4',
    duration: 12,
    mood: 'estival',
    source: 'Pexels',
  },
  {
    id: 'pexels-3',
    title: 'Forêt brume',
    url: 'https://videos.pexels.com/video-files/3129957/3129957-uhd_2560_1440_30fps.mp4',
    duration: 15,
    mood: 'mystique',
    source: 'Pexels',
  },
  {
    id: 'pexels-4',
    title: 'Voitures nuit',
    url: 'https://videos.pexels.com/video-files/3129671/3129671-uhd_2560_1440_30fps.mp4',
    duration: 8,
    mood: 'urbain',
    source: 'Pexels',
  },
  {
    id: 'pexels-5',
    title: 'Neige montagnes',
    url: 'https://videos.pexels.com/video-files/857251/857251-hd_1920_1080_25fps.mp4',
    duration: 15,
    mood: 'froid',
    source: 'Pexels',
  },
  {
    id: 'pexels-6',
    title: 'Pluie fenêtre',
    url: 'https://videos.pexels.com/video-files/3252331/3252331-uhd_2560_1440_30fps.mp4',
    duration: 20,
    mood: 'mélancolique',
    source: 'Pexels',
  },
  {
    id: 'pexels-7',
    title: 'Lumières néon',
    url: 'https://videos.pexels.com/video-files/3129587/3129587-uhd_2560_1440_30fps.mp4',
    duration: 10,
    mood: 'néon',
    source: 'Pexels',
  },
  {
    id: 'pexels-8',
    title: 'Mer vagues',
    url: 'https://videos.pexels.com/video-files/2257012/2257012-hd_1920_1080_30fps.mp4',
    duration: 12,
    mood: 'océan',
    source: 'Pexels',
  },
]

export function getStarterClips() {
  return STARTER_CLIPS
}

// Cherche des clips dont le mood correspond au thème détecté
export function findClipsByMood(mood) {
  if (!mood) return STARTER_CLIPS
  const m = mood.toLowerCase()
  const matches = STARTER_CLIPS.filter((c) => c.mood.toLowerCase().includes(m))
  return matches.length > 0 ? matches : STARTER_CLIPS
}
