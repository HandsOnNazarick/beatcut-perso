import React, { useState, useEffect } from 'react'
import { searchFilms, isApiKeyConfigured, getApiKey, setApiKey } from '../modules/films.js'

export default function FilmSelector({ selectedFilms, onToggle }) {
  const [open, setOpen] = useState(false) // fermé par défaut — feature avancée
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showKeyInput, setShowKeyInput] = useState(false)
  const [apiKey, setApiKeyState] = useState(getApiKey())

  const hasKey = isApiKeyConfigured()

  useEffect(() => {
    if (hasKey) setOpen(true)
  }, [hasKey])

  const handleSearch = async () => {
    if (!query.trim()) return
    if (!hasKey) {
      setError('Configure ta clé TMDB d\'abord')
      setShowKeyInput(true)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const films = await searchFilms(query)
      setResults(films)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveKey = () => {
    if (apiKey.trim()) {
      setApiKey(apiKey.trim())
      setShowKeyInput(false)
    }
  }

  // Si fermé, juste un toggle discret
  if (!open) {
    return (
      <div className="card">
        <div className="section-header">
          <div className="section-title" style={{ opacity: 0.6 }}>
            <span className="section-number">2</span>
            Films (avancé)
          </div>
          <button
            className="btn btn-ghost"
            onClick={() => setOpen(true)}
            style={{ fontSize: 12 }}
          >
            + Ouvrir (clé API requise)
          </button>
        </div>
        <div className="empty-state" style={{ padding: 16 }}>
          <div style={{ fontSize: 11 }}>
            💡 Tu n'as pas besoin de cette section. Utilise la banque de clips par défaut ou upload tes propres vidéos à l'étape 3.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="section-header">
        <div className="section-title">
          <span className="section-number">2</span>
          Sélection du film
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-ghost"
            onClick={() => setShowKeyInput(!showKeyInput)}
            style={{ fontSize: 12 }}
          >
            {showKeyInput ? 'Fermer clé' : hasKey ? '🔑' : '🔑 Configurer'}
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => setOpen(false)}
            style={{ fontSize: 12 }}
          >
            Masquer
          </button>
        </div>
      </div>

      {showKeyInput && (
        <div style={{ marginBottom: 16, padding: 12, background: 'var(--bg-tertiary)', borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
            Clé API TMDB (gratuite, stockée uniquement en local) :
            <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noreferrer" style={{ marginLeft: 6, color: 'var(--accent)' }}>
              Obtenir une clé →
            </a>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKeyState(e.target.value)}
              placeholder="ta_clé_api_tmdb"
              style={{ flex: 1 }}
            />
            <button className="btn btn-primary" onClick={handleSaveKey}>Sauvegarder</button>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
            Optionnel — sert uniquement à suggérer des films qui matchent le thème de ta musique.
            Tu peux skipper et utiliser uniquement tes propres clips.
          </div>
        </div>
      )}

      {hasKey && (
        <>
          <div className="film-search">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Rechercher un film (ex. Drive, Lost in Translation)"
            />
            <button
              className="btn btn-primary"
              onClick={handleSearch}
              disabled={loading || !query.trim()}
            >
              {loading ? <span className="spinner" /> : '🔍'} Chercher
            </button>
          </div>

          {error && <div className="log-line error">{error}</div>}

          {results.length > 0 && (
            <div className="film-list">
              {results.map((film) => {
                const isSelected = selectedFilms.some((f) => f.id === film.id)
                return (
                  <button
                    key={film.id}
                    className={`film-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => onToggle(film)}
                  >
                    <div className="film-poster">
                      {film.poster ? (
                        <img src={film.poster} alt={film.title} loading="lazy" />
                      ) : (
                        <span>Pas d'affiche</span>
                      )}
                    </div>
                    <div className="film-title">{film.title}</div>
                    <div className="film-year">{film.year}</div>
                  </button>
                )
              })}
            </div>
          )}

          {selectedFilms.length > 0 && (
            <div style={{ marginTop: 16, fontSize: 12, color: 'var(--text-secondary)' }}>
              ✓ Films sélectionnés : {selectedFilms.map((f) => f.title).join(', ')}
            </div>
          )}
        </>
      )}
    </div>
  )
}
