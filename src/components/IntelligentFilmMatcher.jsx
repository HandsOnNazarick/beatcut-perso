import React, { useState, useEffect } from 'react'
// Lazy-load des modules IA (Whisper ~75 Mo, ONNX ~6 Mo) uniquement quand activé
const lazyImport = (loader) => () => loader().then((m) => m)

export default function IntelligentFilmMatcher({
  audioFile,
  bpm,
  duration,
  onSelectClips,
}) {
  const [enabled, setEnabled] = useState(false)
  const [step, setStep] = useState('idle') // idle, transcribing, matching, finding, ranking, done
  const [progress, setProgress] = useState(0)
  const [logs, setLogs] = useState([])
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [isWhisperCached, setIsWhisperCached] = useState(false)

  // Clés API
  const [showKeys, setShowKeys] = useState(false)
  const [osKey, setOsKey] = useState(localStorage.getItem('beatcut:os_key') || '')
  const [ytKey, setYtKey] = useState(localStorage.getItem('beatcut:yt_key') || '')
  const [orKey, setOrKey] = useState(localStorage.getItem('beatcut:or_key') || '')

  const isOSConfigured = !!osKey
  const isYTConfigured = !!ytKey
  const isORConfigured = !!orKey
  const allKeysConfigured = isOSConfigured && isYTConfigured && isORConfigured

  const addLog = (msg, type = '') => {
    setLogs((prev) => [...prev.slice(-30), { msg, type, time: Date.now() }])
  }

  const saveKeys = () => {
    localStorage.setItem('beatcut:os_key', osKey)
    localStorage.setItem('beatcut:yt_key', ytKey)
    localStorage.setItem('beatcut:or_key', orKey)
    setShowKeys(false)
  }

  const runPipeline = async () => {
    if (!audioFile || !bpm) return

    setStep('transcribing')
    setProgress(0)
    setLogs([])
    setError(null)
    setResult(null)

    try {
      // === ÉTAPE 1 : Transcription Whisper (lazy-load ~75 Mo) ===
      addLog('🎤 Chargement Whisper (lazy-load, ~80 Mo au premier lancement)...')
      const whisperModule = await import('../modules/whisper.js')
      const transcription = await whisperModule.transcribe(audioFile, (status, pct) => {
        if (status === 'downloading') {
          addLog(`⬇ Téléchargement modèle : ${pct}%`)
          setProgress(pct * 0.2) // 0-20%
        } else if (status === 'transcribing') {
          addLog('🎵 Transcription en cours...')
          setProgress(20 + pct * 0.3) // 20-50%
        }
      })
      setIsWhisperCached(true)

      addLog(`✓ Transcription : "${transcription.text.slice(0, 80)}${transcription.text.length > 80 ? '...' : ''}"`, 'success')

      const phrases = whisperModule.extractKeyPhrases(transcription)
      addLog(`📝 ${phrases.length} phrases clés extraites`)

      if (phrases.length === 0) {
        throw new Error('Aucune parole détectée. Essaie avec un son qui contient des voix.')
      }

      // === ÉTAPE 2 : Détection du thème via LLM ===
      setStep('matching')
      addLog('🎨 Analyse du thème via IA...')
      setProgress(55)

      const llmModule = await import('../modules/llm.js')
      let theme = { theme: 'mélancolique', emotion: 'contemplatif', visualKeywords: [] }
      try {
        theme = await llmModule.detectTheme(transcription.text)
        addLog(`✓ Thème : ${theme.theme} | Émotion : ${theme.emotion}`, 'success')
      } catch (e) {
        addLog(`⚠ Détection thème échouée : ${e.message}`, 'error')
      }

      // === ÉTAPE 3 : Matching OpenSubtitles ===
      setStep('finding')
      addLog('🔍 Recherche de correspondances dans les sous-titres...')
      setProgress(65)

      const subsModule = await import('../modules/subtitles.js')
      const candidates = []

      for (const phrase of phrases.slice(0, 3)) {
        try {
          addLog(`   → "${phrase.text.slice(0, 50)}..."`)
          const searchResult = await subsModule.searchSubtitles(phrase.text, ['fre', 'eng'])

          const topSubs = (searchResult.data || []).slice(0, 5)
          for (const sub of topSubs) {
            const movieTitle = sub.attributes?.release || sub.attributes?.feature_details?.movie_name
            const movieYear = sub.attributes?.feature_details?.movie_release_year

            if (!movieTitle) continue

            // Télécharge et parse le sous-titre
            try {
              const dl = await fetch('https://api.opensubtitles.com/api/v1/download', {
                method: 'POST',
                headers: {
                  'Api-Key': osKey,
                  'User-Agent': 'BeatCutPerso v0.1',
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ file_id: sub.attributes?.files?.[0]?.file_id }),
              })
              const dlData = await dl.json()

              if (dlData.link) {
                const srtRes = await fetch(dlData.link)
                const srtText = await srtRes.text()
                const cues = subsModule.parseSRT(srtText)
                const matches = subsModule.findBestMatches(phrase.text, cues, 1, 0.5)

                if (matches.length > 0) {
                  const match = matches[0]
                  candidates.push({
                    phraseId: phrase.text,
                    movieTitle,
                    movieYear,
                    quote: match.text,
                    timestamp: match.startSec,
                    matchScore: match.score,
                  })
                  addLog(`   ✓ ${movieTitle} : "${match.text.slice(0, 40)}..." (${Math.round(match.startSec)}s)`, 'success')
                }
              }
            } catch (e) {
              addLog(`   ⚠ Skip ${movieTitle} : ${e.message}`, 'error')
            }

            if (candidates.length >= 8) break
          }
        } catch (e) {
          addLog(`   ⚠ Recherche échouée : ${e.message}`, 'error')
        }
        if (candidates.length >= 8) break
      }

      addLog(`✓ ${candidates.length} candidats trouvés`, 'success')
      setProgress(80)

      // === ÉTAPE 4 : Recherche YouTube ===
      addLog('🎬 Recherche des scènes sur YouTube...')

      const ytModule = await import('../modules/youtube.js')
      for (const cand of candidates) {
        try {
          const ytResults = await ytModule.searchVideo(
            `${cand.movieTitle} ${cand.movieYear || ''} ${cand.quote}`.trim(),
            1
          )
          if (ytResults.length > 0) {
            cand.youtube = {
              id: ytResults[0].id,
              title: ytResults[0].title,
              url: `https://www.youtube.com/watch?v=${ytResults[0].id}&t=${Math.floor(cand.timestamp)}s`,
              thumbnail: ytResults[0].thumbnail,
            }
          }
        } catch (e) {
          addLog(`   ⚠ YouTube ${cand.movieTitle} : ${e.message}`, 'error')
        }
      }

      setProgress(90)

      // === ÉTAPE 5 : Tri final via LLM ===
      setStep('ranking')
      addLog('🧠 Tri final par IA...')

      let selections = candidates.map((_, i) => ({ index: i, reason: 'Auto-sélection' }))
      try {
        const llmResult = await llmModule.callLLM(`Tu es directeur artistique. Sélectionne les 5 meilleurs clips pour cette musique.

Paroles : "${transcription.text.slice(0, 300)}"

Candidats :
${candidates.map((c, i) => `${i + 1}. ${c.movieTitle} (${c.movieYear || '?'}) - "${c.quote}" à ${Math.round(c.timestamp)}s`).join('\n')}

Réponds en JSON : {"selections":[{"index":N,"reason":"..."}]}`)

        const jsonMatch = llmResult.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])
          if (parsed.selections) selections = parsed.selections
        }
      } catch (e) {
        addLog(`⚠ Tri LLM échoué, fallback sur tri par score`, 'error')
      }

      const finalClips = selections
        .map((s) => candidates[s.index - 1] || candidates[s.index])
        .filter(Boolean)

      setResult({
        transcription,
        theme,
        phrases,
        candidates,
        finalClips,
      })

      addLog(`🎉 Terminé ! ${finalClips.length} clips recommandés`, 'success')
      setStep('done')
      setProgress(100)
    } catch (e) {
      console.error(e)
      setError(e.message)
      addLog(`❌ ${e.message}`, 'error')
      setStep('error')
    }
  }

  if (!enabled) {
    return (
      <div className="card">
        <div className="section-header">
          <div className="section-title" style={{ opacity: 0.6 }}>
            <span className="section-number">🤖</span>
            IA Films (avancé)
          </div>
          <button
            className="btn btn-ghost"
            onClick={() => setEnabled(true)}
            style={{ fontSize: 12 }}
          >
            + Activer
          </button>
        </div>
        <div className="empty-state" style={{ padding: 16 }}>
          <div style={{ fontSize: 11, marginBottom: 8 }}>
            💡 Whisper transcrit ton son → match avec OpenSubtitles → YouTube → LLM choisit les meilleurs plans.
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            ⚠️ Nécessite 3 clés API (OpenSubtitles, YouTube, OpenRouter).
            La 1ère fois, télécharge Whisper (~75 Mo).
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="section-header">
        <div className="section-title">
          <span className="section-number">🤖</span>
          IA Films
          <span className="tag manual" style={{ marginLeft: 8 }}>Whisper + OS + YT + LLM</span>
        </div>
        <button
          className="btn btn-ghost"
          onClick={() => setEnabled(false)}
          style={{ fontSize: 12 }}
        >
          Masquer
        </button>
      </div>

      {/* Configuration clés API */}
      <div style={{ marginBottom: 16 }}>
        <button
          className="btn btn-secondary"
          onClick={() => setShowKeys(!showKeys)}
          style={{ width: '100%', fontSize: 12 }}
        >
          {showKeys ? '▼' : '▶'} Clés API {allKeysConfigured ? '✓ configurées' : '⚠ manquantes'}
        </button>

        {showKeys && (
          <div style={{ marginTop: 12, padding: 12, background: 'var(--bg-tertiary)', borderRadius: 8 }}>
            <div style={{ fontSize: 11, marginBottom: 8 }}>
              <a href="https://opensubtitles.com/consumers" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>
                OpenSubtitles →
              </a> clé gratuite
            </div>
            <input
              type="password"
              value={osKey}
              onChange={(e) => setOsKey(e.target.value)}
              placeholder="OpenSubtitles API key"
              style={{ width: '100%', marginBottom: 8, fontSize: 11 }}
            />
            <div style={{ fontSize: 11, marginBottom: 8 }}>
              <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>
                YouTube Data API →
              </a>
            </div>
            <input
              type="password"
              value={ytKey}
              onChange={(e) => setYtKey(e.target.value)}
              placeholder="YouTube API key"
              style={{ width: '100%', marginBottom: 8, fontSize: 11 }}
            />
            <div style={{ fontSize: 11, marginBottom: 8 }}>
              <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>
                OpenRouter →
              </a>
            </div>
            <input
              type="password"
              value={orKey}
              onChange={(e) => setOrKey(e.target.value)}
              placeholder="OpenRouter API key"
              style={{ width: '100%', marginBottom: 8, fontSize: 11 }}
            />
            <button className="btn btn-primary" onClick={saveKeys} style={{ width: '100%', fontSize: 12 }}>
              Sauvegarder les clés
            </button>
          </div>
        )}
      </div>

      {!allKeysConfigured && step === 'idle' && (
        <div className="empty-state" style={{ padding: 16 }}>
          Configure tes 3 clés API pour activer l'IA.
        </div>
      )}

      {allKeysConfigured && step === 'idle' && (
        <button
          className="btn btn-primary btn-large"
          onClick={runPipeline}
          style={{ width: '100%' }}
        >
          🤖 Lancer l'IA
          <div style={{ fontSize: 11, fontWeight: 400, marginTop: 4 }}>
            Whisper + OpenSubtitles ({isWhisperCached() ? 'cached' : '~75 Mo à télécharger'})
          </div>
        </button>
      )}

      {(step === 'transcribing' || step === 'matching' || step === 'finding' || step === 'ranking') && (
        <>
          <div style={{ marginBottom: 12, color: 'var(--text-secondary)', fontSize: 13 }}>
            {step === 'transcribing' && '🎤 Transcription...'}
            {step === 'matching' && '🎨 Analyse du thème...'}
            {step === 'finding' && '🔍 Recherche des scènes...'}
            {step === 'ranking' && '🧠 Tri final...'}
          </div>
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
          </div>
        </>
      )}

      {logs.length > 0 && (
        <div style={{ marginTop: 16, maxHeight: 200, overflowY: 'auto', padding: 12, background: 'var(--bg-tertiary)', borderRadius: 8, fontSize: 11 }}>
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

      {step === 'done' && result && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 13, color: 'var(--success)', marginBottom: 12 }}>
            🎉 {result.finalClips.length} scènes recommandées
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {result.finalClips.map((clip, i) => (
              <div key={i} style={{
                padding: 12,
                background: 'var(--bg-tertiary)',
                borderRadius: 8,
                border: '1px solid var(--border)',
              }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>
                  {clip.movieTitle} <span style={{ color: 'var(--text-muted)' }}>({clip.movieYear || '?'})</span>
                </div>
                <div style={{ fontSize: 11, fontStyle: 'italic', color: 'var(--text-secondary)', marginBottom: 6 }}>
                  "{clip.quote.slice(0, 80)}..."
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
                  ⏱ {Math.floor(clip.timestamp / 60)}:{String(Math.floor(clip.timestamp % 60)).padStart(2, '0')} ·
                  Match: {Math.round(clip.matchScore * 100)}%
                </div>
                {clip.youtube ? (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <a
                      href={clip.youtube.url}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-secondary"
                      style={{ fontSize: 11, padding: '6px 10px' }}
                    >
                      ▶️ Watch @ {Math.floor(clip.timestamp)}s
                    </a>
                    <button
                      className="btn btn-ghost"
                      style={{ fontSize: 11, padding: '6px 10px' }}
                      onClick={() => navigator.clipboard?.writeText(clip.youtube.url)}
                    >
                      📋 Copy link
                    </button>
                  </div>
                ) : (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Pas de vidéo YouTube trouvée pour cette scène
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{ marginTop: 16, fontSize: 11, color: 'var(--text-muted)' }}>
            ℹ️ Les scènes s'ouvrent sur YouTube. Pour les intégrer à ton clip :
            <br />• Sur iPhone : screen-record la portion qui t'intéresse, puis upload dans "Mes clips"
            <br />• Sur desktop : utilise yt-dlp ou une extension de download
          </div>
        </div>
      )}
    </div>
  )
}
