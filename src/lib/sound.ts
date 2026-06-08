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

type Tone = { f: number; t: number; d: number; g?: number; type?: OscillatorType }

function play(notes: Tone[]) {
  if (isMuted()) return
  try {
    const ac = getCtx()
    if (!ac) return
    if (ac.state === 'suspended') void ac.resume()
    const now = ac.currentTime
    for (const n of notes) {
      const osc = ac.createOscillator()
      const gain = ac.createGain()
      osc.type = n.type || 'triangle'
      osc.frequency.value = n.f
      const t = now + n.t
      const peak = n.g ?? 0.2
      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.exponentialRampToValueAtTime(peak, t + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + n.d)
      osc.connect(gain).connect(ac.destination)
      osc.start(t)
      osc.stop(t + n.d + 0.02)
    }
  } catch {
    // audio bloqueado o no soportado: ignorar silenciosamente
  }
}

export type SoundKind = 'word' | 'topic' | 'level'

/** Sonido según el logro: juguetón (palabra), medio (tema), triunfal (nivel). */
export function playCelebrationSound(kind: SoundKind = 'topic') {
  if (kind === 'word') {
    // corto y juguetón: 3 notas ascendentes
    play([
      { f: 659.25, t: 0, d: 0.16, g: 0.18, type: 'sine' },
      { f: 783.99, t: 0.08, d: 0.16, g: 0.18, type: 'sine' },
      { f: 1046.5, t: 0.16, d: 0.22, g: 0.2, type: 'sine' },
    ])
  } else if (kind === 'level') {
    // fanfarria triunfal: arpegio + acorde final + brillo
    play([
      { f: 523.25, t: 0, d: 0.26, g: 0.22 },
      { f: 659.25, t: 0.11, d: 0.26, g: 0.22 },
      { f: 783.99, t: 0.22, d: 0.26, g: 0.22 },
      { f: 1046.5, t: 0.33, d: 0.3, g: 0.24 },
      // acorde C mayor sostenido
      { f: 523.25, t: 0.55, d: 0.7, g: 0.14 },
      { f: 659.25, t: 0.55, d: 0.7, g: 0.14 },
      { f: 783.99, t: 0.55, d: 0.7, g: 0.14 },
      { f: 1046.5, t: 0.55, d: 0.7, g: 0.14 },
      { f: 1568.0, t: 0.6, d: 0.5, g: 0.14, type: 'sine' }, // brillo G6
    ])
  } else {
    // tema: arpegio medio + brillito
    play([
      { f: 523.25, t: 0, d: 0.24, g: 0.2 },
      { f: 659.25, t: 0.1, d: 0.24, g: 0.2 },
      { f: 783.99, t: 0.2, d: 0.24, g: 0.2 },
      { f: 1046.5, t: 0.3, d: 0.28, g: 0.22 },
      { f: 1568.0, t: 0.42, d: 0.35, g: 0.16, type: 'sine' },
    ])
  }
}
