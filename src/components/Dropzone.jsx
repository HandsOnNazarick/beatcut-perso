import React, { useState, useRef, useCallback } from 'react'

// iOS Safari sur iCloud Drive filtre AGRESSIVEMENT les fichiers audio via l'attribut accept
// même quand le MIME est correct (.wav depuis Ableton/Logic = grisé).
// Solution : accepter TOUS les fichiers et filtrer côté JS après sélection.
// C'est aussi plus simple pour l'utilisateur sur mobile.

function isAudioFile(file) {
  // 1. Vérif par MIME type
  if (file.type && file.type.startsWith('audio/')) return true
  if (file.type === 'video/mp4') return true // .m4a est parfois mappé en mp4
  if (file.type && file.type === 'application/octet-stream') {
    // 2. Fallback par extension
    return /\.(mp3|wav|m4a|aac|ogg|flac|opus|webm|mp4|3gp|amr)$/i.test(file.name)
  }
  // 3. Dernier recours : extension
  return /\.(mp3|wav|m4a|aac|ogg|flac|opus|webm|mp4|3gp|amr)$/i.test(file.name)
}

export default function Dropzone({ onFile, kind = 'audio', icon = '🎵', hint = 'Tous formats audio — MP3, WAV, M4A, AAC...' }) {
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState(null)
  const inputRef = useRef(null)

  const handleFile = useCallback((file) => {
    setError(null)
    if (kind === 'audio' && !isAudioFile(file)) {
      setError(`"${file.name}" n'a pas l'air d'être un fichier audio. Formats supportés : MP3, WAV, M4A, AAC, OGG, FLAC.`)
      return
    }
    onFile(file)
  }, [onFile, kind])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => setDragOver(false), [])

  const handleClick = () => inputRef.current?.click()

  return (
    <div>
      <div
        className={`dropzone ${dragOver ? 'drag-over' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
      >
        <span className="dropzone-icon">{icon}</span>
        <div className="dropzone-text">Drop ton fichier ici</div>
        <div className="dropzone-hint">ou clique — {hint}</div>
        {/* Pas d'attribut accept = iOS Safari laisse passer tous les fichiers depuis iCloud */}
        <input
          ref={inputRef}
          type="file"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files[0]
            if (f) handleFile(f)
            // Reset pour pouvoir re-uploader le même fichier
            e.target.value = ''
          }}
        />
      </div>
      {error && (
        <div className="log-line error" style={{ marginTop: 12, textAlign: 'center' }}>
          ❌ {error}
        </div>
      )}
    </div>
  )
}
