// === Détection compatibilité navigateur ===
// iOS Safari ne supporte pas SharedArrayBuffer (nécessaire pour ffmpeg.wasm multi-thread)
// même si COOP/COEP headers sont présents — c'est une limitation iOS.
// Sur ces plateformes, on bascule sur un export "basique" via Canvas + MediaRecorder.

export function isFFmpegSupported() {
  // 1. iOS Safari n'a pas SharedArrayBuffer
  if (typeof SharedArrayBuffer === 'undefined') return false

  // 2. Détection explicite iOS (iPadOS aussi)
  const ua = navigator.userAgent
  if (/iPad|iPhone|iPod/.test(ua)) return false

  // 3. Certains navigateurs mobiles n'ont pas WebAssembly threads
  try {
    new WebAssembly.Memory({ shared: true, initial: 1, maximum: 1 })
    return true
  } catch (e) {
    return false
  }
}

export function getBrowserInfo() {
  const ua = navigator.userAgent
  const isIOS = /iPad|iPhone|iPod/.test(ua)
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua)
  const isChrome = /chrome/i.test(ua) && !/edge/i.test(ua)
  const isFirefox = /firefox/i.test(ua)

  let browser = 'Unknown'
  if (isIOS && isSafari) browser = 'Safari iOS'
  else if (isChrome) browser = 'Chrome'
  else if (isFirefox) browser = 'Firefox'
  else if (isSafari) browser = 'Safari'
  else if (/edg/i.test(ua)) browser = 'Edge'

  return { isIOS, isSafari, isChrome, isFirefox, browser }
}

export function getExportMethod() {
  if (isFFmpegSupported()) return 'ffmpeg' // full quality
  return 'canvas' // fallback basique mais compatible partout
}
