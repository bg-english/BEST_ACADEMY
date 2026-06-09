// Reconocimiento de voz del navegador (Web Speech API). Sin costo.
// Soportado en Chrome/Edge (ideal para Chromebook). Fallback elegante si no.

/* eslint-disable @typescript-eslint/no-explicit-any */

export function speechSupported(): boolean {
  if (typeof window === 'undefined') return false
  return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
}

export interface Recognizer {
  stop: () => void
}

export function listenOnce(
  onResult: (transcript: string) => void,
  onError: (err: string) => void,
  lang = 'en-US'
): Recognizer | null {
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  if (!SR) {
    onError('unsupported')
    return null
  }
  try {
    const rec = new SR()
    rec.lang = lang
    rec.interimResults = false
    rec.maxAlternatives = 1
    rec.onresult = (e: any) => {
      const t = e?.results?.[0]?.[0]?.transcript || ''
      onResult(t)
    }
    rec.onerror = (e: any) => onError(e?.error || 'error')
    rec.start()
    return { stop: () => { try { rec.stop() } catch { /* noop */ } } }
  } catch {
    onError('error')
    return null
  }
}
