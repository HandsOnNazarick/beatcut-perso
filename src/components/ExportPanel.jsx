import React, { useState, useEffect } from 'react'
import { exportVideo } from '../modules/export.js'
import { exportVideoCanvas } from '../modules/export-canvas.js'
import { buildBeatSyncTimeline } from '../modules/beatsync.js'
import { isFFmpegSupported, getBrowserInfo, getExportMethod } from '../modules/compat.js'

export default function ExportPanel({
  audioFile,
  bpm,
  beats,
  duration,
  selectedClips,
}) {
  const [exporting, setExporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [logs, setLogs] = useState([])
  const [outputUrl, setOutputUrl] = useState(null)
  const [error, setError] = useState(null)
  const [watermark, setWatermark] = useState('')
  const [duration30s, setDuration30s] = useState(true)
  const [aspectRatio, setAspectRatio] = useState('9:16')
  const [compat, setCompat] = useState(null)

  useEffect(() => {
    const info = getBrowserInfo()
    setCompat({
      ...info,
      ffmpegSupported: isFFmpegSupported(),
      method: getExportMethod(),
    })
  }, [])

  const canExport = audioFile && bpm && selectedClips.length > 0 && !exporting

  const addLog = (msg, type = '') => {
    setLogs((prev) => [...prev.slice(-20), { msg, type, time: Date.now() }])
  }

  const handleExport = async () => {
    if (!canExport) return
    setExporting(true)
    setProgress(0)
    setLogs([])
    setError(null)
    setOutputUrl(null)

    try {
      const exportDuration = duration30s ? Math.min(30, duration) : duration
      const start = 0

      const timeline = buildBeatSyncTimeline({
        audioDuration: exportDuration,
        bpm,
        startTime: start,
        endTime: exportDuration,
        clipUrls: selectedClips.map((c) => c.url),
        beatsPerCut: 2,
      })

      addLog(`Timeline générée : ${timeline.length} segments`, 'success')

      const [w, h] = aspectRatio === '9:16' ? [1080, 1920] : aspectRatio === '1:1' ? [1080, 1080] : [1920, 1080]

      let blob
      const method = getExportMethod()

      if (method === 'ffmpeg') {
        addLog('Méthode : ffmpeg.wasm (full quality)')
        blob = await exportVideo({
          audioFile,
          audioStart: start,
          audioDuration: exportDuration,
          clips: selectedClips.map((c) => ({ url: c.url, duration: c.duration })),
          timeline,
          width: w,
          height: h,
          watermark,
          onProgress: setProgress,
          onLog: addLog,
        })
      } else {
        addLog('Méthode : Canvas + MediaRecorder (compatible iOS)')
        blob = await exportVideoCanvas({
          audioFile,
          audioStart: start,
          audioDuration: exportDuration,
          clips: selectedClips.map((c) => ({ url: c.url, duration: c.duration })),
          timeline,
          width: w,
          height: h,
          watermark,
          onProgress: setProgress,
          onLog: addLog,
        })
      }

      const url = URL.createObjectURL(blob)
      setOutputUrl(url)
      addLog(`✓ Vidéo prête (${(blob.size / 1024 / 1024).toFixed(1)} Mo)`, 'success')
    } catch (e) {
      console.error(e)
      setError(e.message)
      addLog(`Erreur : ${e.message || e}`, 'error')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="export-section">
      <div className="section-header">
        <div className="section-title">
          <span className="section-number">4</span>
          Export
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {compat && (
            <span className={`tag ${compat.ffmpegSupported ? 'auto' : 'manual'}`}>
              {compat.browser} · {compat.ffmpegSupported ? 'ffmpeg' : 'canvas'}
            </span>
          )}
          {canExport && <span className="tag">{selectedClips.length} clip{selectedClips.length > 1 ? 's' : ''}</span>}
        </div>
      </div>

      {compat && !compat.ffmpegSupported && (
        <div style={{
          padding: 12,
          background: 'rgba(251, 191, 36, 0.1)',
          border: '1px solid rgba(251, 191, 36, 0.3)',
          borderRadius: 8,
          marginBottom: 16,
          fontSize: 12,
          color: 'var(--text-secondary)',
        }}>
          ⚠️ <strong>{compat.browser}</strong> ne supporte pas ffmpeg.wasm (limitation navigateur).
          Export via Canvas en temps réel — qualité moindre, durée = temps réel (1 min de vidéo = 1 min de rendu).
          Pour full quality, utilise Chrome/Firefox sur desktop.
        </div>
      )}

      <div className="export-options">
        <div className="export-option">
          <label>Durée</label>
          <select value={duration30s ? '30' : 'full'} onChange={(e) => setDuration30s(e.target.value === '30')}>
            <option value="30">30s (TikTok)</option>
            <option value="full">Complet ({Math.floor(duration)}s)</option>
          </select>
        </div>
        <div className="export-option">
          <label>Format</label>
          <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)}>
            <option value="9:16">9:16 — TikTok/Reels</option>
            <option value="1:1">1:1 — Instagram</option>
            <option value="16:9">16:9 — YouTube</option>
          </select>
        </div>
        <div className="export-option">
          <label>Watermark</label>
          <input
            type="text"
            value={watermark}
            onChange={(e) => setWatermark(e.target.value)}
            placeholder="@tonpseudo"
            maxLength={20}
          />
        </div>
        <div className="export-option">
          <label>BPM</label>
          <input
            type="text"
            value={bpm || '—'}
            readOnly
            style={{ color: 'var(--text-muted)' }}
          />
        </div>
      </div>

      {!canExport && (
        <div className="empty-state">
          {!audioFile && '← Upload un son'}
          {audioFile && !bpm && '← Détection BPM en cours'}
          {audioFile && bpm && selectedClips.length === 0 && '← Sélectionne au moins un clip'}
        </div>
      )}

      {canExport && (
        <button
          className="btn btn-primary btn-large"
          onClick={handleExport}
          disabled={exporting}
          style={{ width: '100%' }}
        >
          {exporting ? (
            <><span className="spinner" /> Export en cours... {progress}%</>
          ) : (
            <>🎬 Générer la vidéo beat-sync</>
          )}
        </button>
      )}

      {exporting && (
        <div className="progress-bar">
          <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
        </div>
      )}

      {logs.length > 0 && (
        <div style={{ marginTop: 16, maxHeight: 160, overflowY: 'auto', padding: 12, background: 'var(--bg-tertiary)', borderRadius: 8 }}>
          {logs.map((log, i) => (
            <div key={i} className={`log-line ${log.type}`}>
              {log.msg}
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="log-line error" style={{ marginTop: 12 }}>
          ❌ {error}
        </div>
      )}

      {outputUrl && (
        <div style={{ marginTop: 16 }}>
          <video
            src={outputUrl}
            controls
            playsInline
            style={{ width: '100%', maxWidth: 360, borderRadius: 8, display: 'block', margin: '0 auto' }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a
              href={outputUrl}
              download={`beatcut-${Date.now()}.mp4`}
              className="btn btn-primary"
            >
              ⬇ Télécharger
            </a>
            <button
              className="btn btn-secondary"
              onClick={() => {
                URL.revokeObjectURL(outputUrl)
                setOutputUrl(null)
              }}
            >
              Nouvel export
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
