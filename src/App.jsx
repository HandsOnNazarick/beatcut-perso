import React, { useState } from 'react'
import Dropzone from './components/Dropzone.jsx'
import AudioAnalyzer from './components/AudioAnalyzer.jsx'
import ArchiveFilmSelector from './components/ArchiveFilmSelector.jsx'
import ClipSelector from './components/ClipSelector.jsx'
import ExportPanel from './components/ExportPanel.jsx'

export default function App() {
  const [audioFile, setAudioFile] = useState(null)
  const [bpm, setBpm] = useState(null)
  const [bpmSource, setBpmSource] = useState(null)
  const [beats, setBeats] = useState([])
  const [duration, setDuration] = useState(0)
  const [selectedFilms, setSelectedFilms] = useState([])
  const [selectedClips, setSelectedClips] = useState([])
  const [theme, setTheme] = useState(null)

  const handleAudioFile = (file) => {
    setAudioFile(file)
    setBpm(null)
    setBpmSource(null)
    setBeats([])
    setSelectedFilms([])
    setSelectedClips([])
  }

  const handleBPMChange = (newBPM, source) => {
    setBpm(newBPM)
    setBpmSource(source)
    // Deviner un mood basique depuis le BPM (heuristique simple)
    if (!theme) {
      let guess = ''
      if (newBPM < 90) guess = 'mélancolique'
      else if (newBPM < 110) guess = 'froid'
      else if (newBPM < 130) guess = 'estival'
      else if (newBPM < 150) guess = 'urbain'
      else guess = 'néon'
      setTheme(guess)
    }
  }

  const handleSelectFilm = (filmWithVideo) => {
    // Archive.org renvoie directement le fichier vidéo à utiliser comme clip
    // On l'ajoute directement à la sélection de clips (étape 3)
    const clipFromFilm = {
      id: `archive-${filmWithVideo.id}-${filmWithVideo.videoUrl.split('/').pop()}`,
      title: `${filmWithFilm.title} — ${filmWithVideo.videoUrl.split('/').pop()}`,
      url: filmWithVideo.videoUrl,
      duration: filmWithVideo.duration || 60,
      mood: filmWithVideo.mood || 'film',
      source: 'Archive.org',
    }

    setSelectedFilms((prev) => [...prev, filmWithVideo])
    setSelectedClips((prev) => {
      const exists = prev.some((c) => c.id === clipFromFilm.id)
      if (exists) return prev
      return [...prev, clipFromFilm]
    })

    // Met à jour le thème si on a un mood depuis le film
    if (filmWithVideo.mood) {
      setTheme(filmWithVideo.mood)
    }
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
    setSelectedFilms([])
    setSelectedClips([])
    setTheme(null)
    setDuration(0)
  }

  return (
    <>
      <header className="app-header">
        <div className="app-title">
          <div className="app-title-logo">B</div>
          <div>
            <div>BeatCut Perso</div>
            <div className="app-subtitle">Clone local · 100% dans le navigateur</div>
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
                Drop ton MP3 → BPM auto → choisis ton film (Archive.org, libre) ou tes clips → exporte en 9:16
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
              <ArchiveFilmSelector
                selectedFilms={selectedFilms}
                onSelect={handleSelectFilm}
              />
            </section>

            <section className="section">
              <ClipSelector
                selectedClips={selectedClips}
                onToggle={toggleClip}
                theme={theme}
              />
            </section>

            <section className="section">
              <ExportPanel
                audioFile={audioFile}
                bpm={bpm}
                beats={beats}
                duration={duration}
                selectedClips={selectedClips}
                selectedFilms={selectedFilms}
              />
            </section>
          </>
        )}
      </main>

      <footer className="app-footer">
        BeatCut Perso · 100% local · tes sons ne quittent jamais ton navigateur
        {bpm && audioFile && (
          <> · BPM {bpm} <span className={`bpm-source ${bpmSource}`} style={{ marginLeft: 4 }}>{bpmSource}</span></>
        )}
      </footer>
    </>
  )
}
