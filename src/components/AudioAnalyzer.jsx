import React, { useEffect, useRef, useState } from 'react'
import WaveSurfer from 'wavesurfer.js'
import { detectBPM, validateBPM, getBeatTimes } from '../modules/bpm.js'

export default function AudioAnalyzer({ file, onBPMChange, onBeatsChange, onDurationChange }) {
  const containerRef = useRef(null)
  const wavesurferRef = useRef(null)
  const [duration, setDuration] = useState(0)
  const [bpmAuto, setBpmAuto] = useState(null)
  const [bpmManual, setBpmManual] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!file || !containerRef.current) return

    setAnalyzing(true)
    setError(null)
    setBpmAuto(null)

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#a0a0b0',
      progressColor: '#ff3b6b',
      cursorColor: '#ffffff',
      barWidth: 2,
      barRadius: 2,
      height: 80,
      normalize: true,
    })

    wavesurferRef.current = ws

    ws.loadBlob(file)

    ws.on('ready', async () => {
      const dur = ws.getDuration()
      setDuration(dur)
      onDurationChange?.(dur)

      try {
        // Décode l'audio pour BPM detection
        const arrayBuffer = await file.arrayBuffer()
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)
        const result = await detectBPM(audioBuffer)
        setBpmAuto(result.bpm)
        onBPMChange?.(result.bpm, 'auto')
        audioCtx.close()
      } catch (e) {
        console.error('BPM detection failed', e)
        setError('Détection BPM échouée — saisis-le manuellement')
      } finally {
        setAnalyzing(false)
      }
    })

    ws.on('timeupdate', (t) => setCurrentTime(t))

    ws.on('error', (e) => {
      console.error('Wavesurfer error', e)
      setError('Erreur de chargement audio')
      setAnalyzing(false)
    })

    return () => {
      ws.destroy()
    }
  }, [file])

  // Recalcule les beats si BPM change
  useEffect(() => {
    const bpm = bpmManual ? validateBPM(bpmManual) : bpmAuto
    if (bpm && duration > 0) {
      const beats = getBeatTimes(duration, bpm)
      onBeatsChange?.(beats)
    }
  }, [bpmAuto, bpmManual, duration])

  const handleManualBPM = (val) => {
    setBpmManual(val)
    const v = validateBPM(val)
    if (v) {
      onBPMChange?.(v, 'manual')
    } else if (!val) {
      // Vide → retour à l'auto
      if (bpmAuto) onBPMChange?.(bpmAuto, 'auto')
    }
  }

  const handleReset = () => {
    setBpmManual('')
    if (bpmAuto) onBPMChange?.(bpmAuto, 'auto')
  }

  const effectiveBPM = bpmManual ? validateBPM(bpmManual) : bpmAuto
  const source = bpmManual ? 'manual' : 'auto'

  return (
    <div className="card">
      <div className="section-header">
        <div className="section-title">
          <span className="section-number">1</span>
          Analyse audio
        </div>
        {duration > 0 && (
          <span className="tag">
            {Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, '0')}
          </span>
        )}
      </div>

      <div ref={containerRef} className="waveform-container">
        {!duration && <div className="waveform-status">Chargement de la waveform...</div>}
      </div>

      {error && (
        <div className="log-line error" style={{ marginTop: 12 }}>{error}</div>
      )}

      {analyzing && (
        <div style={{ marginTop: 12, color: 'var(--text-muted)', fontSize: 13 }}>
          <span className="spinner" /> Détection du BPM...
        </div>
      )}

      {effectiveBPM && (
        <>
          <div className="bpm-display" style={{ marginTop: 16 }}>
            <span className="bpm-value">{effectiveBPM}</span>
            <span className="bpm-unit">BPM</span>
            <span className={`bpm-source ${source}`}>{source === 'auto' ? 'Auto' : 'Manuel'}</span>
          </div>

          <div className="bpm-controls">
            <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Override :</label>
            <input
              type="number"
              min="40"
              max="240"
              placeholder="ex. 142"
              value={bpmManual}
              onChange={(e) => handleManualBPM(e.target.value)}
            />
            {bpmManual && (
              <button className="btn btn-ghost" onClick={handleReset}>Reset auto</button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
