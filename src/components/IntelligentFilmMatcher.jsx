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
  const [step, setStep] = useState('idle')
  const [progress, setProgress] = useState(0)
  const [logs, setLogs] = useState([])
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [proxyUrl, setProxyUrlState] = useState('')
  const [proxyInput, setProxyInput] = useState('')
  const [isWhisperCached, setIsWhisperCached] = useState(false)

  // Clés API (legacy / fallback)
  const [showKeys, setShowKeys] = useState(false)
  const [osKey, setOsKey] = useState(localStorage.getItem('beatcut:os_key') || '')
  const [ytKey, setYtKey] = useState(localStorage.getItem('beatcut:yt_key') || '')
  const [orKey, setOrKey] = useState(localStorage.getItem('beatcut:or_key') || '')

  const useProxy = !!proxyUrl
  const isOSConfigured = useProxy || !!osKey
  const isYTConfigured = useProxy || !!ytKey
  const isORConfigured = useProxy || !!orKey
  const allKeysConfigured = isOSConfigured && isYTConfigured && isORConfigured

  // Charge le proxy URL au mount
  useEffect(() => {
    const url = localStorage.getItem('beatcut:proxy_url') || ''
    setProxyUrlState(url)
    setProxyInput(url)
  }, [])

  const saveProxy = () => {
    const url = proxyInput.trim().replace(/\/+$/, '') // trim trailing slash
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
          setProgress(pct * 0.3) // 0-30%
        } else if (status === 'transcribing') {
          addLog('🎵 Transcription en cours...')
          setProgress(30 + pct * 0.4) // 30-70%
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
      setProgress(75)

      const llmModule = await import('../modules/llm.js')
      let theme = { theme: 'mélancolique', emotion: 'contemplatif', visualKeywords: [] }
      try {
        theme = await llmModule.detectTheme(transcription.text)
        addLog(`✓ Thème : ${theme.theme} | Émotion : ${theme.emotion}`, 'success')
      } catch (e) {
        addLog(`⚠ Détection thème échouée : ${e.message}`, 'error')
      }

      // === ÉTAPE 3 : Recommandation de clips via LLM (sans OpenSubtitles/YouTube) ===
      setStep('finding')
      addLog('🎬 Génération des recommandations de clips...')
      setProgress(85)

      // On demande au LLM de suggérer des films/scènes qui matchent le thème
      let recommendations = []
      try {
        const prompt = `Tu es directeur artistique pour clips musicaux TikTok.

Paroles de la musique :
"${transcription.text}"

Thème détecté : ${theme.theme} (${theme.emotion})

Tâche : suggère 5 films ou séries dont l'esthétique/ambiance matche avec ces paroles et ce thème.
Pour chaque suggestion, donne :
- Titre du film
- Année
- Description courte de l'ambiance (1 phrase)
- Une scène/iconique qui pourrait servir de clip

Réponds UNIQUEMENT avec un JSON valide (rien autour) :
{
  "recommendations": [
    {
      "title": "...",
      "year": ...,
      "description": "...",
      "iconicScene": "..."
    },
    ...
  ]
}`

        const response = await llmModule.callLLM(prompt, {
          temperature: 0.8,
          max_tokens: 800,
        })

        const jsonMatch = response.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])
          recommendations = (parsed.recommendations || []).slice(0, 5).map((rec, i) => ({
            movieTitle: rec.title,
            movieYear: rec.year,
            phraseId: phrases[0]?.text || '',
            quote: rec.iconicScene || rec.description,
            timestamp: 0,
            matchScore: 0.85 - i * 0.05,
            reasoning: rec.description,
            youtube: null, // Pas de YouTube en mode simple
          }))
        }
      } catch (e) {
        addLog(`⚠ Recommandations LLM échouées : ${e.message}`, 'error')
      }

      if (recommendations.length === 0) {
        // Fallback : recommandations hardcodées basées sur le thème
        const FALLBACK_BY_THEME = {
          'mélancolique': ['Lost in Translation', 'Her', 'Eternal Sunshine', 'Moonlight', 'Past Lives'],
          'amour': ['Call Me By Your Name', 'La La Land', 'In the Mood for Love', 'Eternal Sunshine', 'Normal People'],
          'festif': ['Mamma Mia', 'La La Land', 'The Greatest Showman', 'Eurovision', 'Pitch Perfect'],
          'sombre': ['Blade Runner 2049', 'Joker', 'The Batman', 'Se7en', 'No Country for Old Men'],
          'énergique': ['Baby Driver', 'Mad Max Fury Road', 'John Wick', 'The Fall Guy', 'Top Gun'],
          'nuit': ['Drive', 'Blade Runner', 'Taxi Driver', 'After Hours', 'Eyes Wide Shut'],
          'ville': ['Lost in Translation', 'Her', 'Taxi Driver', 'Birdman', 'Collateral'],
          'nature': ['Into the Wild', 'Wild', 'Nomadland', 'The Revenant', 'Grizzly Man'],
        }
        const themeKey = (theme.theme || '').toLowerCase()
        const films = FALLBACK_BY_THEME[themeKey] || FALLBACK_BY_THEME['mélancolique']
        recommendations = films.slice(0, 5).map((title, i) => ({
          movieTitle: title,
          movieYear: '?',
          phraseId: phrases[0]?.text || '',
          quote: `Scène emblématique de ${title}`,
          timestamp: 0,
          matchScore: 0.8 - i * 0.05,
          reasoning: `Match mood (${theme.theme})`,
          youtube: null,
        }))
        addLog(`ℹ Fallback : 5 films recommandés pour le thème "${theme.theme}"`, 'success')
      } else {
        addLog(`✓ ${recommendations.length} films recommandés`, 'success')
      }

      setProgress(95)

      setResult({
        transcription,
        theme,
        phrases,
        candidates: recommendations,
        finalClips: recommendations,
        isSimpleMode: true, // pour l'UI
      })

      addLog(`🎉 Terminé ! ${recommendations.length} films recommandés`, 'success')
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

      {/* Configuration proxy (recommandé) ou clés API */}
      <div style={{ marginBottom: 16 }}>
        {/* Clé OpenRouter directe (mode simple) */}
        <div style={{
          padding: 12,
          background: orKey ? 'rgba(74, 222, 128, 0.1)' : 'var(--bg-tertiary)',
          borderRadius: 8,
          marginBottom: 12,
          border: orKey ? '1px solid var(--success)' : '1px solid var(--border)',
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            🔑 Clé OpenRouter <span className="tag auto">Direct</span>
            {orKey && <span style={{ color: 'var(--success)', fontSize: 11 }}>✓ Configurée</span>}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
            Colle ta clé OpenRouter (commence par sk-or-v1-). Stockée uniquement en local.
            <br />
            <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>
              → Créer une clé sur openrouter.ai/keys
            </a>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              type="password"
              value={orKey}
              onChange={(e) => setOrKey(e.target.value)}
              placeholder="sk-or-v1-..."
              style={{ flex: 1, fontSize: 11 }}
            />
            <button
              className="btn btn-primary"
              onClick={() => {
                localStorage.setItem('beatcut:or_key', orKey)
                setShowKeys(false)
              }}
              style={{ fontSize: 11, padding: '8px 12px' }}
            >
              OK
            </button>
            {orKey && (
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setOrKey('')
                  localStorage.removeItem('beatcut:or_key')
                }}
                style={{ fontSize: 11, padding: '8px 12px' }}
              >
                ✕
              </button>
            )}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 8 }}>
            ⚠️ OpenSubtitles et YouTube sont skippés pour l'instant.
            Le matching de scènes et la recherche YouTube seront ajoutés plus tard.
            Pour l'instant, l'IA utilise uniquement le LLM sur tes paroles.
          </div>
        </div>

        <button
          className="btn btn-secondary"
          onClick={() => setShowKeys(!showKeys)}
          style={{ width: '100%', fontSize: 12 }}
        >
          {showKeys ? '▼' : '▶'} Mode avancé (proxy / sous-titres / YouTube)
        </button>

        {showKeys && (
          <div style={{ marginTop: 12, padding: 12, background: 'var(--bg-tertiary)', borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
              💡 Mode avancé (optionnel) — pour utilisateurs qui veulent le matching complet phrases ↔ films ↔ YouTube.
              Pas nécessaire pour ton usage.
            </div>
            {/* Mode proxy */}
            <div style={{ marginBottom: 12 }}>
              <input
                type="text"
                value={proxyInput}
                onChange={(e) => setProxyInput(e.target.value)}
                placeholder="URL proxy Cloudflare Workers (optionnel)"
                style={{ width: '100%', fontSize: 11, marginBottom: 4 }}
              />
              <div style={{ display: 'flex', gap: 6 }}>
                {useProxy ? (
                  <button className="btn btn-secondary" onClick={clearProxy} style={{ fontSize: 10, padding: '4px 8px' }}>
                    ✕ Proxy actif
                  </button>
                ) : (
                  <button className="btn btn-primary" onClick={saveProxy} style={{ fontSize: 10, padding: '4px 8px' }}>
                    Activer proxy
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {!allKeysConfigured && step === 'idle' && (
        <div className="empty-state" style={{ padding: 16 }}>
          {useProxy ? (
            'Le proxy est configuré mais injoignable. Vérifie l\'URL.'
          ) : (
            'Configure le proxy (recommandé) OU tes 3 clés API.'
          )}
        </div>
      )}

      {allKeysConfigured && step === 'idle' && (
        <>
          <button
            className="btn btn-primary btn-large"
            onClick={runPipeline}
            style={{ width: '100%' }}
          >
            🤖 Lancer l'IA
            <div style={{ fontSize: 11, fontWeight: 400, marginTop: 4 }}>
              Whisper {isWhisperCached ? '(cached)' : '+ ~80 Mo 1ère fois'} · via {useProxy ? 'proxy' : 'clés directes'}
            </div>
          </button>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 8, textAlign: 'center' }}>
            ⚠️ Recommandé sur Chrome/Firefox desktop.<br />
            iOS Safari peut struggle avec Whisper (80 Mo ONNX Runtime).
          </div>
        </>
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
                  {clip.timestamp > 0 ? (
                    <>⏱ {Math.floor(clip.timestamp / 60)}:{String(Math.floor(clip.timestamp % 60)).padStart(2, '0')} · </>
                  ) : null}
                  {clip.reasoning || `Match: ${Math.round(clip.matchScore * 100)}%`}
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
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <a
                      href={`https://www.google.com/search?q=${encodeURIComponent(`${clip.movieTitle} ${clip.movieYear || ''} iconic scene clip`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-secondary"
                      style={{ fontSize: 11, padding: '6px 10px' }}
                    >
                      🔍 Chercher "{clip.movieTitle}" sur Google
                    </a>
                    <a
                      href={`https://www.imdb.com/find?q=${encodeURIComponent(clip.movieTitle)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-ghost"
                      style={{ fontSize: 11, padding: '6px 10px' }}
                    >
                      🎬 IMDb
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{ marginTop: 16, fontSize: 11, color: 'var(--text-muted)' }}>
            💡 Ces recommandations viennent de l'IA basée sur tes paroles.
            <br />• Click sur un film → Google/IMDb pour trouver la scène
            <br />• Sur iPhone : screen-record la portion, puis upload dans "Mes clips"
            <br />• Sur desktop : utilise yt-dlp ou une extension de download
          </div>
        </div>
      )}
    </div>
  )
}
