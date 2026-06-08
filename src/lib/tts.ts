// Text-to-speech del navegador (Web Speech API). Sin costo ni dependencias.

export function ttsSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

export function speak(text: string, lang = 'en-US') {
  if (!ttsSupported() || !text) return
  try {
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = lang
    u.rate = 0.95
    window.speechSynthesis.speak(u)
  } catch {
    // navegador sin soporte: ignorar
  }
}
