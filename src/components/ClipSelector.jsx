import React, { useState } from 'react'
import { getStarterClips, findClipsByMood, findClipsByFilmRef } from '../modules/clips.js'
import Dropzone from './Dropzone.jsx'
import StockClipSearch from './StockClipSearch.jsx'

// Sélecteur de clips : Pexels (banque ciné-look) + upload perso
// Les clips sont taggés avec des références cinéphiles ("Style Drive", "Style Lost in Translation"...)
// Tu peux chercher par titre de film OU par mood

const MOOD_TAGS = [
  { id: 'all', label: '🎬 Tous' },
  { id: 'nuit', label: '🌙 Nuit' },
  { id: 'mélancolique', label: '🌧 Mélancolie' },
  { id: 'urbain', label: '🏙 Urbain' },
  { id: 'néon', label: '💡 Néon' },
  { id: 'estival', label: '☀️ Estival' },
  { id: 'océan', label: '🌊 Océan' },
  { id: 'cyberpunk', label: '🤖 Cyberpunk' },
  { id: 'désert', label: '🏜 Désert' },
  { id: 'nature', label: '🌲 Nature' },
  { id: 'mystique', label: '🔮 Mystique' },
  { id: 'roadtrip', label: '🛣 Roadtrip' },
  { id: 'onirique', label: '💭 Onirique' },
  { id: 'romantique', label: '❤️ Romantique' },
]

const FILM_SUGGESTIONS = [
  'Drive', 'Lost in Translation', 'Blade Runner', 'Call Me By Your Name',
  'La La Land', 'Mad Max', 'Pulp Fiction', 'Inception', 'Into the Wild',
  'Requiem for a Dream', 'Eternal Sunshine', 'Her', 'Mamma Mia',
]

export default function ClipSelector({ selectedClips, onToggle, theme }) {
  const [customClips, setCustomClips] = useState([])
  const [tab, setTab] = useState('starter')
  const [activeMood, setActiveMood] = useState('all')
  const [filmQuery, setFilmQuery] = useState('')

  const handleCustomUpload = (file) => {
    const url = URL.createObjectURL(file)
    const newClip = {
      id: `custom-${Date.now()}`,
      title: file.name,
      url,
      duration: 0,
      mood: 'custom',
      refs: [],
      source: 'Upload',
      file,
    }
    setCustomClips((prev) => [...prev, newClip])
  }

  // Filtrage des clips
  let filteredClips = getStarterClips()

  if (filmQuery.trim()) {
    // Recherche par référence film
    filteredClips = findClipsByFilmRef(filmQuery)
    if (filteredClips.length === 0) {
      // Fallback : recherche dans le titre
      const q = filmQuery.toLowerCase()
      filteredClips = getStarterClips().filter(
        (c) => c.title.toLowerCase().includes(q) || c.refs.some((r) => r.toLowerCase().includes(q))
      )
    }
  } else if (activeMood !== 'all') {
    filteredClips = findClipsByMood(activeMood)
  }

  return (
    <div className="card">
      <div className="section-header">
        <div className="section-title">
          <span className="section-number">3</span>
          Sélection des clips
        </div>
        <span className="tag">{selectedClips.length} sélectionné{selectedClips.length > 1 ? 's' : ''}</span>
      </div>

      <div className="toggle-group" style={{ marginBottom: 16 }}>
        <button
          className={`toggle-btn ${tab === 'starter' ? 'active' : ''}`}
          onClick={() => setTab('starter')}
        >
          🎬 Banque ciné ({getStarterClips().length})
        </button>
        <button
          className={`toggle-btn ${tab === 'search' ? 'active' : ''}`}
          onClick={() => setTab('search')}
        >
          🔍 Pexels + Pixabay
        </button>
        <button
          className={`toggle-btn ${tab === 'custom' ? 'active' : ''}`}
          onClick={() => setTab('custom')}
        >
          📁 Mes clips ({customClips.length})
        </button>
      </div>

      {tab === 'starter' && (
        <>
          {/* Recherche par film */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              💡 Cherche par film référence
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
              <input
                type="text"
                value={filmQuery}
                onChange={(e) => setFilmQuery(e.target.value)}
                placeholder="Ex: Drive, Lost in Translation, Blade Runner..."
                style={{ flex: 1, minWidth: 200 }}
              />
              {filmQuery && (
                <button className="btn btn-ghost" onClick={() => setFilmQuery('')}>
                  ✕
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {FILM_SUGGESTIONS.slice(0, 8).map((film) => (
                <button
                  key={film}
                  className="tag"
                  style={{ cursor: 'pointer', border: 'none' }}
                  onClick={() => setFilmQuery(film)}
                >
                  {film}
                </button>
              ))}
            </div>
          </div>

          {/* Filtres par mood */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Ou par mood
            </div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {MOOD_TAGS.map((m) => (
                <button
                  key={m.id}
                  className={`tag ${activeMood === m.id ? 'auto' : ''}`}
                  style={{
                    cursor: 'pointer',
                    border: 'none',
                    background: activeMood === m.id ? 'var(--accent)' : 'var(--bg-tertiary)',
                    color: activeMood === m.id ? 'white' : 'var(--text-secondary)',
                  }}
                  onClick={() => {
                    setActiveMood(m.id)
                    setFilmQuery('')
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {filteredClips.length === 0 ? (
            <div className="empty-state">
              Aucun clip ne matche "{filmQuery || activeMood}". Essaie un autre film.
            </div>
          ) : (
            <>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
                {filteredClips.length} clip{filteredClips.length > 1 ? 's' : ''} correspondant{filteredClips.length > 1 ? 's' : ''}
              </div>
              <div className="clips-grid">
                {filteredClips.map((clip) => {
                  const isSelected = selectedClips.some((c) => c.id === clip.id)
                  return (
                    <button
                      key={clip.id}
                      className={`clip-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => onToggle(clip)}
                    >
                      <div className="clip-thumbnail">
                        <video
                          src={clip.url}
                          muted
                          loop
                          playsInline
                          preload="metadata"
                          onMouseEnter={(e) => e.target.play().catch(() => {})}
                          onMouseLeave={(e) => {
                            e.target.pause()
                            e.target.currentTime = 0
                          }}
                          onTouchStart={(e) => e.target.play().catch(() => {})}
                        />
                        <span className="clip-duration">{clip.duration}s</span>
                      </div>
                      <div className="clip-meta">
                        <span style={{ fontWeight: 600 }}>{clip.title}</span>
                        <span>{clip.source}</span>
                      </div>
                      <div style={{ padding: '0 8px 8px', fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.3 }}>
                        {clip.refs.slice(0, 2).map((ref, i) => (
                          <span key={ref} className="tag" style={{ marginRight: 2, marginBottom: 2, display: 'inline-block' }}>
                            {ref}
                          </span>
                        ))}
                      </div>
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </>
      )}

      {tab === 'custom' && (
        <>
          <Dropzone
            onFile={handleCustomUpload}
            kind="video"
            icon="🎬"
            hint="MP4, MOV, WebM — tes rushs perso"
          />
          {customClips.length > 0 && (
            <div className="clips-grid" style={{ marginTop: 16 }}>
              {customClips.map((clip) => {
                const isSelected = selectedClips.some((c) => c.id === clip.id)
                return (
                  <button
                    key={clip.id}
                    className={`clip-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => onToggle(clip)}
                  >
                    <div className="clip-thumbnail">
                      <video src={clip.url} muted playsInline />
                    </div>
                    <div className="clip-meta">
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {clip.title}
                      </span>
                      <span>Custom</span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </>
      )}

      {tab === 'search' && (
        <StockClipSearch onSelect={(clip) => onToggle(clip)} />
      )}
    </div>
  )
}
