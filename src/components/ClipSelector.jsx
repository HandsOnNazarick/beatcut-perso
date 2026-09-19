import React, { useState } from 'react'
import { getStarterClips, findClipsByMood } from '../modules/clips.js'
import Dropzone from './Dropzone.jsx'

export default function ClipSelector({ selectedClips, onToggle, theme }) {
  const starterClips = theme ? findClipsByMood(theme) : getStarterClips()
  const [customClips, setCustomClips] = useState([])
  const [tab, setTab] = useState('starter')

  const handleCustomUpload = (file) => {
    const url = URL.createObjectURL(file)
    const newClip = {
      id: `custom-${Date.now()}`,
      title: file.name,
      url,
      duration: 0, // inconnu jusqu'au chargement
      mood: 'custom',
      source: 'Upload',
      file,
    }
    setCustomClips((prev) => [...prev, newClip])
  }

  const allClips = [...starterClips, ...customClips]

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
          🎬 Banque par défaut ({starterClips.length})
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
          {theme && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
              Suggestions filtrées par mood : <span className="tag manual">{theme}</span>
              <button
                className="btn btn-ghost"
                style={{ marginLeft: 8, fontSize: 11, padding: '2px 6px' }}
                onClick={() => {/* noop — handled via theme prop change */}}
              >
                Voir tous
              </button>
            </div>
          )}
          <div className="clips-grid">
            {starterClips.map((clip) => {
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
                      onMouseEnter={(e) => e.target.play()}
                      onMouseLeave={(e) => { e.target.pause(); e.target.currentTime = 0 }}
                    />
                    <span className="clip-duration">{clip.duration}s</span>
                  </div>
                  <div className="clip-meta">
                    <span>{clip.title}</span>
                    <span>{clip.source}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </>
      )}

      {tab === 'custom' && (
        <>
          <Dropzone
            onFile={handleCustomUpload}
            accept="video/*"
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

      {allClips.length === 0 && (
        <div className="empty-state">
          Aucun clip disponible. Upload tes propres vidéos ou configure un thème.
        </div>
      )}
    </div>
  )
}
