import React, { useState, useRef, useCallback } from 'react'

export default function Dropzone({ onFile, accept = 'audio/*', icon = '🎵', hint = 'MP3, WAV, M4A' }) {
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef(null)

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) onFile(file)
  }, [onFile])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => setDragOver(false), [])

  const handleClick = () => inputRef.current?.click()

  return (
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
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files[0]
          if (f) onFile(f)
        }}
      />
    </div>
  )
}
