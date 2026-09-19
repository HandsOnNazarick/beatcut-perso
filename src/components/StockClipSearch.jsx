import React, { useState, useEffect } from 'react'
import { searchAllSources, addClipToLocal } from '../modules/stock-clips.js'

/**
 * Sélecteur de clips depuis Pexels + Pixabay
 * Nécessite que le proxy Cloudflare soit configuré avec les clés PEXELS_KEY + PIXABAY_KEY
 */
export default function StockClipSearch({ onSelect }) {
  const [proxyUrl, setProxyUrlState] = useState('')
  const [proxyInput, setProxyInput] = useState('')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [totalResults, setTotalResults] = useState(0)
  const [addedIds, setAddedIds] = useState(new Set())

  useEffect(() => {
    const url = localStorage.getItem('beatcut:proxy_url') || ''
    setProxyUrlState(url)
    setProxyInput(url)
  }, [])

  const saveProxy = () => {
    const url = proxyInput.trim().replace(/\/+$/, '')
    if (url) {
      localStorage.setItem('beatcut:proxy_url', url)
      setProxyUrlState(url)
    }
  }

  const clearProxy = () => {
    localStorage.removeItem('beatcut:proxy_url')
    setProxyUrlState('')
    setProxyInput('')
  }

  const handleSearch = async (e) => {
    e?.preventDefault()
    if (!query.trim() || !proxyUrl) return

    setLoading(true)
    setError(null)
    setPage(1)

    try {
      const clips = await searchAllSources(query, { perPage: 20, orientation: 'portrait' })
      setResults(clips)
      // Pixabay retourne total via pagination
      setTotalResults(clips.length)
    } catch (e) {
      setError(e.message)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = (clip) => {
    if (addedIds.has(clip.id)) return

    // Utilise l'URL proxifiée comme source vidéo
    // Le proxy stream le contenu avec les bons headers CORS
    const proxiedClip = {
      ...clip,
      id: clip.id,
      title: `${clip.source}: ${clip.title}`,
      url: `${proxyUrl}/proxy/download?url=${encodeURIComponent(clip.url)}`,
      source: clip.source,
      isProxied: true,
    }

    onSelect(proxiedClip)
    setAddedIds((prev) => new Set([...prev, clip.id]))
  }

  if (!proxyUrl) {
    return (
      <div className="card">
        <div className="section-header">
          <div className="section-title">
            <span className="section-number">🌐</span>
            Recherche Pexels + Pixabay
            <span className="tag manual" style={{ marginLeft: 8 }}>Proxy requis</span>
          </div>
        </div>
        <div style={{ padding: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
            Pour rechercher des clips sans restrictions CORS, déploie le proxy Cloudflare Workers :
          </div>
          <div style={{
            background: 'var(--bg-primary)',
            padding: 8,
            borderRadius: 6,
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            marginBottom: 12,
          }}>
            <div>cd C:\Users\alaza\beatcut-ia-proxy</div>
            <div>deploy.bat</div>
          </div>
          <input
            type="text"
            value={proxyInput}
            onChange={(e) => setProxyInput(e.target.value)}
            placeholder="https://beatcut-ia-proxy.xxx.workers.dev"
            style={{ width: '100%', fontSize: 12, marginBottom: 8 }}
          />
          <button
            className="btn btn-primary"
            onClick={saveProxy}
            style={{ width: '100%' }}
          >
            Sauvegarder URL proxy
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="section-header">
        <div className="section-title">
          <span className="section-number">🌐</span>
          Recherche Pexels + Pixabay
          <span className="tag auto" style={{ marginLeft: 8 }}>Via proxy</span>
        </div>
        <button
          className="btn btn-ghost"
          onClick={clearProxy}
          style={{ fontSize: 11 }}
        >
          Changer proxy
        </button>
      </div>

      <form onSubmit={handleSearch} style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ex: neon city night, beach sunset, forest fog..."
            style={{ flex: 1, fontSize: 13 }}
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || !query.trim()}
            style={{ fontSize: 13, padding: '10px 16px' }}
          >
            {loading ? <span className="spinner" /> : '🔍'} Chercher
          </button>
        </div>
      </form>

      {error && (
        <div className="log-line error" style={{ marginBottom: 12 }}>
          ❌ {error}
        </div>
      )}

      {loading && (
        <div className="empty-state">
          <span className="spinner" /> Recherche Pexels + Pixabay...
        </div>
      )}

      {!loading && results.length === 0 && !error && (
        <div className="empty-state" style={{ fontSize: 12 }}>
          🔍 Cherche "neon city night", "beach sunset", "forest fog", "rain street"...
          <br />
          Tu peux filtrer par mood en cherchant des mots-clés en anglais.
        </div>
      )}

      {results.length > 0 && (
        <>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
            {results.length} clips trouvés
          </div>
          <div className="clips-grid">
            {results.map((clip) => {
              const isAdded = addedIds.has(clip.id)
              return (
                <button
                  key={clip.id}
                  className={`clip-card ${isAdded ? 'selected' : ''}`}
                  onClick={() => handleAdd(clip)}
                  disabled={isAdded}
                  style={{ opacity: isAdded ? 0.6 : 1 }}
                >
                  <div className="clip-thumbnail">
                    {clip.thumbnail && (
                      <img
                        src={clip.thumbnail}
                        alt={clip.title}
                        loading="lazy"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    )}
                    {clip.duration > 0 && (
                      <span className="clip-duration">{clip.duration}s</span>
                    )}
                    {isAdded && (
                      <div style={{
                        position: 'absolute',
                        top: 6,
                        right: 6,
                        background: 'var(--accent)',
                        color: 'white',
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: 10,
                        fontWeight: 700,
                      }}>
                        ✓ AJOUTÉ
                      </div>
                    )}
                  </div>
                  <div className="clip-meta">
                    <span style={{ fontWeight: 600, fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {clip.title}
                    </span>
                    <span>{clip.source}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
