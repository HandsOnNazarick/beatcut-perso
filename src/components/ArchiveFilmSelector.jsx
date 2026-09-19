import React, { useState, useEffect } from 'react'
import { getCuratedFilms, findFilmsByMood, searchArchive, getVideoFiles } from '../modules/archive.js'

// Sélecteur de films Archive.org — 100% légal (domaine public)
// Pas de clé API nécessaire

export default function ArchiveFilmSelector({ selectedFilms, onSelect }) {
  const [films, setFilms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState(null)
  const [activeTab, setActiveTab] = useState('curated')
  const [loadingFiles, setLoadingFiles] = useState({})
  const [selectedFilm, setSelectedFilm] = useState(null)
  const [availableFiles, setAvailableFiles] = useState([])

  useEffect(() => {
    loadCurated()
  }, [])

  const loadCurated = () => {
    setLoading(true)
    setError(null)
    // Films curatés — pas besoin d'API
    setFilms(getCuratedFilms())
    setLoading(false)
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setLoading(true)
    setError(null)
    try {
      const results = await searchArchive(searchQuery, 15)
      setSearchResults(results)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleFilmClick = async (film) => {
    setSelectedFilm(film)
    setAvailableFiles([])
    setLoadingFiles((prev) => ({ ...prev, [film.id]: true }))

    try {
      const files = await getVideoFiles(film.id)
      setAvailableFiles(files)
    } catch (e) {
      console.error(e)
      setAvailableFiles([])
    } finally {
      setLoadingFiles((prev) => ({ ...prev, [film.id]: false }))
    }
  }

  const handleSelectFile = (film, file) => {
    onSelect({
      ...film,
      videoUrl: file.url,
      duration: file.duration,
      source: 'Archive.org',
    })
  }

  const currentFilms = activeTab === 'curated'
    ? films
    : (searchResults || [])

  return (
    <div className="card">
      <div className="section-header">
        <div className="section-title">
          <span className="section-number">2</span>
          Sélection du film
          <span className="tag auto" style={{ marginLeft: 8 }}>Archive.org · domaine public</span>
        </div>
      </div>

      <div className="toggle-group" style={{ marginBottom: 16 }}>
        <button
          className={`toggle-btn ${activeTab === 'curated' ? 'active' : ''}`}
          onClick={() => setActiveTab('curated')}
        >
          🎬 Sélection ({films.length})
        </button>
        <button
          className={`toggle-btn ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => setActiveTab('search')}
        >
          🔍 Recherche libre
        </button>
      </div>

      {activeTab === 'search' && (
        <div className="film-search">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Ex: noir, horror, sci-fi, 1970s..."
          />
          <button
            className="btn btn-primary"
            onClick={handleSearch}
            disabled={loading || !searchQuery.trim()}
          >
            {loading ? <span className="spinner" /> : '🔍'}
          </button>
        </div>
      )}

      {error && <div className="log-line error">{error}</div>}

      {loading && activeTab === 'search' ? (
        <div className="empty-state"><span className="spinner" /> Recherche en cours...</div>
      ) : currentFilms.length === 0 ? (
        <div className="empty-state">
          {activeTab === 'search'
            ? 'Aucun résultat. Essaie d\'autres mots-clés (en anglais c\'est mieux).'
            : 'Aucun film disponible'}
        </div>
      ) : (
        <div className="film-list">
          {currentFilms.map((film) => {
            const isLoading = loadingFiles[film.id]
            const isSelected = selectedFilm?.id === film.id

            return (
              <button
                key={film.id}
                className={`film-card ${isSelected ? 'selected' : ''}`}
                onClick={() => handleFilmClick(film)}
              >
                <div className="film-poster">
                  {activeTab === 'curated' ? (
                    <div style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'linear-gradient(135deg, #1a1a2e, #2a1a3e)',
                      color: '#ff3b6b',
                      fontSize: 32,
                      fontWeight: 900,
                    }}>
                      🎬
                    </div>
                  ) : film.poster ? (
                    <img src={film.poster} alt={film.title} loading="lazy" />
                  ) : (
                    <span>No poster</span>
                  )}
                </div>
                <div className="film-title">{film.title}</div>
                <div className="film-year">
                  {film.year} · {film.mood || '—'}
                  {isLoading && ' · ⏳'}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {selectedFilm && (
        <div style={{
          marginTop: 16,
          padding: 16,
          background: 'var(--bg-tertiary)',
          borderRadius: 8,
        }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>
            {selectedFilm.title} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({selectedFilm.year})</span>
          </div>
          {selectedFilm.director && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
              {selectedFilm.director}
            </div>
          )}
          {selectedFilm.note && (
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12, fontStyle: 'italic' }}>
              {selectedFilm.note}
            </div>
          )}

          {loadingFiles[selectedFilm.id] ? (
            <div style={{ padding: 12, color: 'var(--text-muted)', fontSize: 13 }}>
              <span className="spinner" /> Chargement des fichiers vidéo...
            </div>
          ) : availableFiles.length === 0 ? (
            <div className="log-line error">Aucun fichier vidéo disponible pour ce film.</div>
          ) : (
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Fichiers vidéo disponibles ({availableFiles.length})
              </div>
              {availableFiles.map((file) => (
                <button
                  key={file.name}
                  className="btn btn-secondary"
                  onClick={() => handleSelectFile(selectedFilm, file)}
                  style={{ width: '100%', marginBottom: 6, justifyContent: 'space-between' }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {file.name}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {(file.size / 1024 / 1024).toFixed(1)} MB
                    {file.duration > 0 && ` · ${Math.round(file.duration / 60)}min`}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedFilms.length > 0 && (
        <div style={{ marginTop: 16, fontSize: 12, color: 'var(--text-secondary)' }}>
          ✓ {selectedFilms.length} fichier{selectedFilms.length > 1 ? 's' : ''} sélectionné{selectedFilms.length > 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}
