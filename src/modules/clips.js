// === Module Clips Pexels - Banque étendue avec références ciné ===
// Clips vidéo libres de droits (Pexels CC0) organisés par style cinéphile
// Chaque clip est taggé avec des films dont il évoque l'ambiance

const STARTER_CLIPS = [
  // === Style Drive (2011) - Nicolas Winding Refn ===
  {
    id: 'drive-1',
    title: 'Ville néon nuit',
    url: 'https://videos.pexels.com/video-files/852400/852400-hd_1920_1080_30fps.mp4',
    duration: 10,
    mood: 'nuit',
    refs: ['Drive', 'Blade Runner', 'The Neon Demon'],
    source: 'Pexels',
  },
  {
    id: 'drive-2',
    title: 'Voitures de nuit',
    url: 'https://videos.pexels.com/video-files/3129671/3129671-uhd_2560_1440_30fps.mp4',
    duration: 8,
    mood: 'urbain',
    refs: ['Drive', 'Baby Driver', 'Fast & Furious'],
    source: 'Pexels',
  },
  {
    id: 'drive-3',
    title: 'Lumières urbaines',
    url: 'https://videos.pexels.com/video-files/3129587/3129587-uhd_2560_1440_30fps.mp4',
    duration: 10,
    mood: 'néon',
    refs: ['Drive', 'Lost in Translation', 'Enter the Void'],
    source: 'Pexels',
  },

  // === Style Lost in Translation (2003) - Sofia Coppola ===
  {
    id: 'lit-1',
    title: 'Ville contemplative',
    url: 'https://videos.pexels.com/video-files/857195/857195-hd_1920_1080_30fps.mp4',
    duration: 12,
    mood: 'mélancolique',
    refs: ['Lost in Translation', 'Her', 'In the Mood for Love'],
    source: 'Pexels',
  },
  {
    id: 'lit-2',
    title: 'Fenêtre & ville',
    url: 'https://videos.pexels.com/video-files/3252331/3252331-uhd_2560_1440_30fps.mp4',
    duration: 20,
    mood: 'mélancolique',
    refs: ['Lost in Translation', 'The Intouchables', 'Birdman'],
    source: 'Pexels',
  },
  {
    id: 'lit-3',
    title: 'Métropole nuit',
    url: 'https://videos.pexels.com/video-files/3129957/3129957-uhd_2560_1440_30fps.mp4',
    duration: 15,
    mood: 'urbain',
    refs: ['Lost in Translation', 'Taxi Driver', ' Collateral'],
    source: 'Pexels',
  },

  // === Style Call Me By Your Name (2017) - Luca Guadagnino ===
  {
    id: 'cmbyn-1',
    title: 'Été doré',
    url: 'https://videos.pexels.com/video-files/2257012/2257012-hd_1920_1080_30fps.mp4',
    duration: 12,
    mood: 'estival',
    refs: ['Call Me By Your Name', 'Mamma Mia', 'La La Land'],
    source: 'Pexels',
  },
  {
    id: 'cmbyn-2',
    title: 'Coucher de soleil',
    url: 'https://videos.pexels.com/video-files/857251/857251-hd_1920_1080_25fps.mp4',
    duration: 15,
    mood: 'estival',
    refs: ['Call Me By Your Name', 'The Dreamers', 'Moonlight'],
    source: 'Pexels',
  },
  {
    id: 'cmbyn-3',
    title: 'Vagues douces',
    url: 'https://videos.pexels.com/video-files/4763824/4763824-uhd_2560_1440_30fps.mp4',
    duration: 10,
    mood: 'océan',
    refs: ['Call Me By Your Name', 'The Talented Mr. Ripley', 'Splash'],
    source: 'Pexels',
  },

  // === Style Blade Runner (1982) - Ridley Scott ===
  {
    id: 'br-1',
    title: 'Pluie urbaine',
    url: 'https://videos.pexels.com/video-files/6981411/6981411-uhd_2560_1440_30fps.mp4',
    duration: 12,
    mood: 'cyberpunk',
    refs: ['Blade Runner', 'Ghost in the Shell', 'The Matrix'],
    source: 'Pexels',
  },
  {
    id: 'br-2',
    title: 'Néon asiatique',
    url: 'https://videos.pexels.com/video-files/5495815/5495815-uhd_2560_1440_30fps.mp4',
    duration: 10,
    mood: 'néon',
    refs: ['Blade Runner', 'Enter the Void', 'Suspiria'],
    source: 'Pexels',
  },

  // === Style Mad Max (2015) - George Miller ===
  {
    id: 'mm-1',
    title: 'Désert',
    url: 'https://videos.pexels.com/video-files/4763824/4763824-uhd_2560_1440_30fps.mp4',
    duration: 14,
    mood: 'désert',
    refs: ['Mad Max', 'Sicario', 'No Country for Old Men'],
    source: 'Pexels',
  },

  // === Style Into the Wild (2007) ===
  {
    id: 'itw-1',
    title: 'Nature sauvage',
    url: 'https://videos.pexels.com/video-files/857195/857195-hd_1920_1080_30fps.mp4',
    duration: 18,
    mood: 'nature',
    refs: ['Into the Wild', 'Wild', 'Nomadland'],
    source: 'Pexels',
  },
  {
    id: 'itw-2',
    title: 'Montagne brumeuse',
    url: 'https://videos.pexels.com/video-files/3129957/3129957-uhd_2560_1440_30fps.mp4',
    duration: 15,
    mood: 'mystique',
    refs: ['Into the Wild', 'The Revenant', 'In the Mood for Love'],
    source: 'Pexels',
  },

  // === Style Pulp Fiction (1994) ===
  {
    id: 'pf-1',
    title: 'Route 66',
    url: 'https://videos.pexels.com/video-files/3129671/3129671-uhd_2560_1440_30fps.mp4',
    duration: 12,
    mood: 'roadtrip',
    refs: ['Pulp Fiction', 'Thelma & Louise', 'Easy Rider'],
    source: 'Pexels',
  },

  // === Style Requiem for a Dream (2000) - Darren Aronofsky ===
  {
    id: 'rfd-1',
    title: 'Aiguilles & ombres',
    url: 'https://videos.pexels.com/video-files/3252331/3252331-uhd_2560_1440_30fps.mp4',
    duration: 20,
    mood: 'psyché',
    refs: ['Requiem for a Dream', 'Black Swan', 'Eternal Sunshine'],
    source: 'Pexels',
  },

  // === Style La La Land (2016) ===
  {
    id: 'lalaland-1',
    title: 'Lights & couleurs',
    url: 'https://videos.pexels.com/video-files/3129587/3129587-uhd_2560_1440_30fps.mp4',
    duration: 11,
    mood: 'romantique',
    refs: ['La La Land', '500 Days of Summer', 'Amélie'],
    source: 'Pexels',
  },

  // === Style Inception (2010) ===
  {
    id: 'inception-1',
    title: 'Architecture abstraite',
    url: 'https://videos.pexels.com/video-files/6981411/6981411-uhd_2560_1440_30fps.mp4',
    duration: 13,
    mood: 'onirique',
    refs: ['Inception', 'Tenet', 'Doctor Strange'],
    source: 'Pexels',
  },
]

export function getStarterClips() {
  return STARTER_CLIPS
}

export function findClipsByMood(mood) {
  if (!mood) return STARTER_CLIPS
  const m = mood.toLowerCase()
  const matches = STARTER_CLIPS.filter((c) => c.mood.toLowerCase().includes(m))
  return matches.length > 0 ? matches : STARTER_CLIPS
}

export function findClipsByFilmRef(filmTitle) {
  if (!filmTitle) return []
  const t = filmTitle.toLowerCase()
  return STARTER_CLIPS.filter((c) =>
    c.refs.some((ref) => ref.toLowerCase().includes(t) || t.includes(ref.toLowerCase()))
  )
}
