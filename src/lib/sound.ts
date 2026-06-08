// Sonido de celebración sintetizado (Web Audio API). Sin archivos externos.

let ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  return ctx
}

const MUTE_KEY = 'best_sound_muted'

export function isMuted(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(MUTE_KEY) === '1'
}

export function setMuted(muted: boolean) {
  if (typeof window === 'undefined') return
  localStorage.setItem(MUTE_KEY, muted ? '1' : '0')
}

/** Arpegio mayor ascendente + brillito final: suena a "¡lo lograste!". */
export function playCelebrationSound() {
  if (isMuted()) return
  try {
    const ac = getCtx()
    if (!ac) return
    if (ac.state === 'suspended') void ac.resume()
    const now = ac.currentTime

    const notes = [523.25, 659.25, 783.99, 1046.5] // C5 E5 G5 C6
    notes.forEach((freq, i) => {
      const osc = ac.createOscillator()
      const gain = ac.createGain()
      osc.type = 'triangle'
      osc.frequency.value = freq
      const t = now + i * 0.1
      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.exponentialRampToValueAtTime(0.22, t + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.26)
      osc.connect(gain).connect(ac.destination)
      osc.start(t)
      osc.stop(t + 0.3)
    })

    // brillito final
    const s = ac.createOscillator()
    const sg = ac.createGain()
    s.type = 'sine'
    s.frequency.value = 1568 // G6
    const ts = now + 0.42
    sg.gain.setValueAtTime(0.0001, ts)
    sg.gain.exponentialRampToValueAtTime(0.18, ts + 0.02)
    sg.gain.exponentialRampToValueAtTime(0.0001, ts + 0.35)
    s.connect(sg).connect(ac.destination)
    s.start(ts)
    s.stop(ts + 0.4)
  } catch {
    // audio bloqueado o no soportado: ignorar silenciosamente
  }
}
