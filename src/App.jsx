import React, { useState } from 'react'
import Dropzone from './components/Dropzone.jsx'
import AudioAnalyzer from './components/AudioAnalyzer.jsx'
import ClipSelector from './components/ClipSelector.jsx'
import ExportPanel from './components/ExportPanel.jsx'

export default function App() {
  const [audioFile, setAudioFile] = useState(null)
  const [bpm, setBpm] = useState(null)
  const [bpmSource, setBpmSource] = useState(null)
  const [beats, setBeats] = useState([])
  const [duration, setDuration] = useState(0)
  const [selectedClips, setSelectedClips] = useState([])

  const handleAudioFile = (file) => {
    setAudioFile(file)
    setBpm(null)
    setBpmSource(null)
    setBeats([])
    setSelectedClips([])
  }

  const handleBPMChange = (newBPM, source) => {
    setBpm(newBPM)
    setBpmSource(source)
  }

  const toggleClip = (clip) => {
    setSelectedClips((prev) => {
      const exists = prev.some((c) => c.id === clip.id)
      if (exists) return prev.filter((c) => c.id !== clip.id)
      return [...prev, clip]
    })
  }

  const reset = () => {
    setAudioFile(null)
    setBpm(null)
    setBpmSource(null)
    setBeats([])
    setSelectedClips([])
    setDuration(0)
  }

  return (
    <>
      <header className="app-header">
        <div className="app-title">
          <div className="app-title-logo">B</div>
          <div>
            <div>BeatCut Perso</div>
            <div className="app-subtitle">100% local · aucune clé API</div>
          </div>
        </div>
        {audioFile && (
          <button className="btn btn-ghost" onClick={reset}>
            ↺ Nouveau projet
          </button>
        )}
      </header>

      <main className="main-content">
        {!audioFile ? (
          <div className="section">
            <Dropzone onFile={handleAudioFile} />
            <div className="empty-state" style={{ marginTop: 24 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🎬</div>
              <div style={{ color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 600 }}>
                Transforme tes sons en vidéos calées sur le beat
              </div>
              <div style={{ fontSize: 12 }}>
                Drop ton son → BPM auto → choisis tes clips → exporte en 9:16
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 12 }}>
                💡 Pour de vrais visuels sur iPhone, upload tes propres rushs dans "Mes clips"
              </div>
            </div>
          </div>
        ) : (
          <>
            <section className="section">
              <AudioAnalyzer
                file={audioFile}
                onBPMChange={handleBPMChange}
                onBeatsChange={setBeats}
                onDurationChange={setDuration}
              />
            </section>

            <section className="section">
              <ClipSelector
                selectedClips={selectedClips}
                onToggle={toggleClip}
              />
            </section>

            <section className="section">
              <ExportPanel
                audioFile={audioFile}
                bpm={bpm}
                beats={beats}
                duration={duration}
                selectedClips={selectedClips}
              />
            </section>
          </>
        )}
      </main>

      <footer className="app-footer">
        BeatCut Perso · 100% local · aucune clé API nécessaire
        {bpm && audioFile && (
          <> · BPM {bpm} <span className={`bpm-source ${bpmSource}`} style={{ marginLeft: 4 }}>{bpmSource}</span></>
        )}
      </footer>
    </>
  )
}
