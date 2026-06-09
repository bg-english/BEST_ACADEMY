'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { PracticeExercise } from '@/lib/types'
import { playCorrect, playWrong } from '@/lib/sound'
import { speak } from '@/lib/tts'
import { listenOnce, speechSupported } from '@/lib/speech'
import { recordProgress } from '@/lib/gamification'

export type ExamMode = 'placement' | 'quiz' | 'final'

interface Props {
  mode: ExamMode
  studentId: string
  onClose: () => void
}

const CONFIG: Record<ExamMode, { title: string; emoji: string; size: number; desc: string }> = {
  placement: { title: 'Examen de inicio', emoji: '🚀', size: 12, desc: 'Mide tu nivel actual. Responde lo que puedas; te ubicaremos en el punto justo.' },
  quiz: { title: 'Quiz corto', emoji: '⚡', size: 12, desc: 'Un repaso rápido de todo lo aprendido.' },
  final: { title: 'Examen final', emoji: '🎓', size: 24, desc: 'Evalúa todas las unidades y habilidades. ¡Demuestra lo que sabes!' },
}

const norm = (s: string) => s.toLowerCase().trim().replace(/\s+/g, ' ').replace(/[.!?¡¿,]/g, '')
function shuffle<T>(a: T[]): T[] { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]] } return a }
function matchSpeech(t: string, g: string): boolean {
  const a = norm(t), b = norm(g); if (!a) return false; if (a === b) return true
  const gw = b.split(' ').filter(Boolean); const tw = new Set(a.split(' '))
  const hits = gw.filter((w) => tw.has(w)).length
  return gw.length > 0 && hits / gw.length >= 0.7
}

// Arma un examen cubriendo todos los TIPOS y repartiendo por habilidad/área
function buildQueue(all: PracticeExercise[], n: number): PracticeExercise[] {
  const picked: PracticeExercise[] = []
  const used = new Set<number>()
  const take = (pool: PracticeExercise[]) => {
    const avail = pool.filter((e) => !used.has(e.id))
    if (!avail.length) return
    const c = avail[Math.floor(Math.random() * avail.length)]
    used.add(c.id); picked.push(c)
  }
  // 1) al menos uno de cada tipo presente
  const types = Array.from(new Set(all.map((e) => e.type)))
  types.forEach((t) => { if (picked.length < n) take(all.filter((e) => e.type === t)) })
  // 2) rellenar repartiendo por área (round-robin)
  const areas = Array.from(new Set(all.map((e) => e.area)))
  let ai = 0
  let guard = 0
  while (picked.length < n && guard < n * 20) {
    take(all.filter((e) => e.area === areas[ai % areas.length]))
    ai++; guard++
  }
  return shuffle(picked)
}

export default function ExamView({ mode, studentId, onClose }: Props) {
  const cfg = CONFIG[mode]
  const [all, setAll] = useState<PracticeExercise[]>([])
  const [phase, setPhase] = useState<'intro' | 'run' | 'done'>('intro')
  const [queue, setQueue] = useState<PracticeExercise[]>([])
  const [idx, setIdx] = useState(0)
  const [results, setResults] = useState<{ area: string; ok: boolean }[]>([])

  // estado por ejercicio
  const [answered, setAnswered] = useState(false)
  const [ok, setOk] = useState(false)
  const [chosen, setChosen] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [built, setBuilt] = useState<string[]>([])
  const [bank, setBank] = useState<string[]>([])
  const [recording, setRecording] = useState(false)
  const [transcript, setTranscript] = useState('')

  useEffect(() => {
    supabase.from('practice_exercises').select('*')
      .then(({ data }) => { if (data) setAll(data as PracticeExercise[]) })
  }, [])

  const ex = queue[idx]
  const setup = useCallback((e: PracticeExercise) => {
    setAnswered(false); setOk(false); setChosen(null); setInput(''); setBuilt([]); setTranscript(''); setRecording(false)
    setBank(e.type === 'reorder' ? shuffle(e.payload.words || []) : [])
  }, [])

  const start = () => {
    const q = buildQueue(all, cfg.size)
    if (!q.length) return
    setQueue(q); setIdx(0); setResults([]); setPhase('run'); setup(q[0])
  }

  const grade = (answer: string) => {
    if (answered || !ex) return
    const correct =
      ex.type === 'speaking' ? matchSpeech(answer, ex.correct_answer)
      : ex.type === 'fill_blank' || ex.type === 'listening'
        ? norm(answer) === norm(ex.correct_answer) || (ex.payload.accept || []).some((a) => norm(a) === norm(answer))
        : norm(answer) === norm(ex.correct_answer)
    setAnswered(true); setOk(correct); setChosen(answer)
    correct ? playCorrect() : playWrong()
    setResults((r) => [...r, { area: ex.area, ok: correct }])
  }

  const startSpeak = () => {
    if (answered || recording) return
    setRecording(true); setTranscript('')
    listenOnce((t) => { setRecording(false); setTranscript(t); grade(t) }, () => setRecording(false))
  }

  const next = async () => {
    if (idx + 1 >= queue.length) {
      // guardar resultados + recompensas
      const correct = results.filter((r) => r.ok).length
      const total = queue.length
      if (mode === 'placement') {
        const maxLevel = Math.max(1, ...all.map((e) => e.level))
        const lvl = Math.max(1, Math.min(maxLevel, Math.round((correct / total) * maxLevel)))
        const units = Array.from(new Set(all.map((e) => e.unit_id)))
        await Promise.all(units.map((u) =>
          supabase.from('student_practice_stats').upsert(
            { student_id: studentId, unit_id: u, area: 'all', level_reached: lvl, total_correct: 0, total_answered: 0, updated_at: new Date().toISOString() },
            { onConflict: 'student_id,unit_id,area' }
          )
        ))
      } else {
        const xp = correct * (mode === 'final' ? 5 : 3)
        if (xp > 0) await recordProgress(studentId, xp)
      }
      setPhase('done')
    } else {
      const ni = idx + 1; setIdx(ni); setup(queue[ni])
    }
  }

  const correctCount = results.filter((r) => r.ok).length
  const bySkill = useMemo(() => {
    const m: Record<string, { ok: number; total: number }> = {}
    results.forEach((r) => { m[r.area] = m[r.area] || { ok: 0, total: 0 }; m[r.area].ok += r.ok ? 1 : 0; m[r.area].total += 1 })
    return m
  }, [results])

  // ---- INTRO ----
  if (phase === 'intro') {
    return (
      <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex items-center justify-center p-4">
        <div className="glass-card glow-cyan rounded-3xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-3">{cfg.emoji}</div>
          <h2 className="font-headline-md text-2xl text-on-surface mb-2">{cfg.title}</h2>
          <p className="text-on-surface-variant mb-6">{cfg.desc}</p>
          <p className="font-stat-label text-stat-label text-secondary uppercase mb-6">{cfg.size} preguntas · todas las habilidades</p>
          <button onClick={start} disabled={all.length === 0}
            className="w-full bg-gradient-to-r from-primary to-secondary text-on-primary py-3 rounded-xl font-button-text hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 mb-2">
            {all.length === 0 ? 'Cargando…' : 'Comenzar'}
          </button>
          <button onClick={onClose} className="text-sm text-on-surface-variant hover:text-on-surface">Cancelar</button>
        </div>
      </div>
    )
  }

  // ---- DONE ----
  if (phase === 'done') {
    const pct = queue.length ? Math.round((correctCount / queue.length) * 100) : 0
    const passed = pct >= 70
    const maxLevel = Math.max(1, ...all.map((e) => e.level))
    const lvl = Math.max(1, Math.min(maxLevel, Math.round((correctCount / queue.length) * maxLevel)))
    return (
      <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex items-center justify-center p-4 overflow-auto">
        <div className="glass-card glow-cyan rounded-3xl p-6 max-w-md w-full text-center my-6">
          <div className="text-6xl mb-2">{mode === 'placement' ? '🧭' : passed ? '🏆' : '💪'}</div>
          <h2 className="font-headline-md text-2xl text-on-surface mb-1">
            {mode === 'placement' ? '¡Listo tu nivel!' : passed ? '¡Aprobado!' : '¡Buen intento!'}
          </h2>
          <p className="font-headline-md text-3xl text-secondary my-2">{correctCount}/{queue.length} <span className="text-lg text-on-surface-variant">({pct}%)</span></p>
          {mode === 'placement' && <p className="text-on-surface-variant mb-2">Te ubicamos en el <b className="text-tertiary">Nivel {lvl}</b>. ¡A practicar!</p>}

          <div className="text-left bg-surface-container-lowest/60 rounded-2xl p-4 my-4">
            <p className="font-button-text text-on-surface mb-2 text-sm">Por habilidad:</p>
            {Object.entries(bySkill).map(([area, s]) => {
              const p = Math.round((s.ok / s.total) * 100)
              return (
                <div key={area} className="mb-2">
                  <div className="flex justify-between text-sm">
                    <span className="capitalize text-on-surface-variant">{area}</span>
                    <span className="text-on-surface-variant">{s.ok}/{s.total}</span>
                  </div>
                  <div className="w-full bg-surface-container rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full ${p >= 70 ? 'bg-tertiary' : p >= 40 ? 'bg-amber-400' : 'bg-error'}`} style={{ width: `${p}%` }} />
                  </div>
                </div>
              )
            })}
          </div>

          <button onClick={onClose}
            className="w-full bg-gradient-to-r from-primary to-secondary text-on-primary py-3 rounded-xl font-button-text hover:scale-[1.02] active:scale-95 transition-all">
            Terminar
          </button>
        </div>
      </div>
    )
  }

  // ---- RUN ----
  if (!ex) return null
  const optCls = (correct: boolean, wrong: boolean) =>
    `w-full text-left px-5 py-4 rounded-2xl font-button-text border transition-all ${
      correct ? 'border-tertiary bg-tertiary/10 text-tertiary'
      : wrong ? 'border-error bg-error/10 text-error'
      : 'glass-card border-white/10 hover:border-secondary/50 hover:scale-[1.01] text-on-surface'}`
  const checkBtn = 'mt-4 w-full bg-gradient-to-r from-primary to-secondary text-on-primary py-3 rounded-xl font-button-text hover:scale-[1.01] active:scale-95 transition-all'
  const inputCls = 'w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-4 py-3 text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/40 placeholder:text-outline/50'
  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md p-4 overflow-auto">
      <div className="max-w-2xl mx-auto py-4">
        <div className="flex justify-between items-center text-on-surface-variant mb-3">
          <button onClick={onClose} className="hover:text-on-surface flex items-center gap-1"><span className="material-symbols-outlined text-base">close</span> Salir</button>
          <span className="font-button-text text-on-surface">{cfg.emoji} {cfg.title}</span>
          <span className="font-stat-label text-secondary">{idx + 1}/{queue.length}</span>
        </div>
        <div className="w-full bg-surface-container rounded-full h-2 mb-5">
          <div className="bg-gradient-to-r from-tertiary to-secondary h-2 rounded-full transition-all" style={{ width: `${((idx) / queue.length) * 100}%` }} />
        </div>

        <div className="glass-card rounded-3xl p-6 md:p-8">
          <div className="font-stat-label text-stat-label text-on-surface-variant capitalize mb-2">{ex.area}</div>
          <p className="font-headline-md text-xl text-on-surface mb-5">{ex.prompt}</p>

          {ex.type === 'multiple_choice' && (
            <div className="space-y-3">
              {(ex.payload.options || []).map((opt) => (
                <button key={opt} disabled={answered} onClick={() => grade(opt)}
                  className={optCls(!!answered && norm(opt) === norm(ex.correct_answer), !!answered && opt === chosen && norm(opt) !== norm(ex.correct_answer))}>{opt}</button>
              ))}
            </div>
          )}

          {ex.type === 'true_false' && (
            <div className="grid grid-cols-2 gap-3">
              {['true', 'false'].map((v) => (
                <button key={v} disabled={answered} onClick={() => grade(v)}
                  className={`py-4 rounded-2xl font-button-text border transition-all ${answered && v === norm(ex.correct_answer) ? 'border-tertiary bg-tertiary/10 text-tertiary' : answered && v === chosen ? 'border-error bg-error/10 text-error' : 'glass-card border-white/10 hover:border-secondary/50 text-on-surface'}`}>
                  {v === 'true' ? '✔ Verdadero' : '✗ Falso'}
                </button>
              ))}
            </div>
          )}

          {ex.type === 'fill_blank' && (
            <div>
              <input value={input} onChange={(e) => setInput(e.target.value)} disabled={answered}
                onKeyDown={(e) => { if (e.key === 'Enter' && !answered && input.trim()) grade(input) }}
                placeholder="Escribe tu respuesta…" className={inputCls} />
              {!answered && <button onClick={() => input.trim() && grade(input)} className={checkBtn}>Comprobar</button>}
            </div>
          )}

          {ex.type === 'reorder' && (
            <div>
              <div className="min-h-[52px] border-2 border-dashed border-white/10 rounded-xl p-2 mb-3 flex flex-wrap gap-2 bg-surface-container-lowest/50">
                {built.map((w, i) => <button key={i} disabled={answered} onClick={() => { setBuilt(built.filter((_, j) => j !== i)); setBank([...bank, w]) }} className="bg-secondary/15 text-secondary px-3 py-1.5 rounded-lg font-button-text">{w}</button>)}
              </div>
              <div className="flex flex-wrap gap-2">
                {bank.map((w, i) => <button key={i} disabled={answered} onClick={() => { setBuilt([...built, w]); setBank(bank.filter((_, j) => j !== i)) }} className="bg-surface-container-high text-on-surface px-3 py-1.5 rounded-lg font-button-text hover:bg-white/10">{w}</button>)}
              </div>
              {!answered && <button onClick={() => grade(built.join(' '))} disabled={built.length === 0} className={`${checkBtn} disabled:opacity-50`}>Comprobar</button>}
            </div>
          )}

          {ex.type === 'listening' && (
            <div>
              <button type="button" onClick={() => speak(ex.payload.audio || ex.correct_answer)} className="mb-4 w-full bg-gradient-to-r from-primary-container to-secondary-container text-on-primary-fixed py-3.5 rounded-xl font-button-text hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2"><span className="material-symbols-outlined filled-icon">volume_up</span> Escuchar</button>
              {ex.payload.options ? (
                <div className="space-y-3">
                  {ex.payload.options.map((opt) => (
                    <button key={opt} disabled={answered} onClick={() => grade(opt)}
                      className={optCls(!!answered && norm(opt) === norm(ex.correct_answer), !!answered && opt === chosen && norm(opt) !== norm(ex.correct_answer))}>{opt}</button>
                  ))}
                </div>
              ) : (
                <div>
                  <input value={input} onChange={(e) => setInput(e.target.value)} disabled={answered}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !answered && input.trim()) grade(input) }}
                    placeholder="Escribe lo que escuchaste…" className={inputCls} />
                  {!answered && <button onClick={() => input.trim() && grade(input)} className={checkBtn}>Comprobar</button>}
                </div>
              )}
            </div>
          )}

          {ex.type === 'speaking' && (
            <div className="text-center">
              <div className="glass-card rounded-2xl p-5 mb-5 flex items-center justify-center gap-3">
                <span className="font-headline-md text-xl text-on-surface">{ex.payload.target || ex.correct_answer}</span>
                <button type="button" onClick={() => speak(ex.payload.target || ex.correct_answer)} className="text-secondary"><span className="material-symbols-outlined">volume_up</span></button>
              </div>
              {speechSupported() ? (
                <>
                  {!answered && <button onClick={startSpeak} disabled={recording} className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center text-white transition-all ${recording ? 'bg-error animate-pulse shadow-[0_0_30px_rgba(255,180,171,0.5)]' : 'bg-gradient-to-tr from-primary to-secondary hover:scale-110 active:scale-95 shadow-lg shadow-primary/30'}`}><span className="material-symbols-outlined text-4xl filled-icon">mic</span></button>}
                  {transcript && <p className="mt-3 text-sm text-on-surface-variant">Dijiste: <span className="font-medium text-on-surface">&quot;{transcript}&quot;</span></p>}
                </>
              ) : (
                !answered && <button onClick={() => grade(ex.correct_answer)} className={checkBtn}>✓ Ya la practiqué</button>
              )}
            </div>
          )}

          {answered && (
            <div className={`mt-5 p-5 rounded-2xl border ${ok ? 'bg-tertiary-container/20 border-tertiary/30' : 'bg-error-container/10 border-error/30'}`}>
              <p className="font-button-text mb-1 flex items-center gap-2"><span className={`material-symbols-outlined ${ok ? 'text-tertiary' : 'text-error'}`}>{ok ? 'check_circle' : 'cancel'}</span>{ok ? '¡Correcto!' : `Respuesta: "${ex.correct_answer}"`}</p>
              {ex.explanation && <p className="text-sm text-on-surface-variant ml-8">{ex.explanation}</p>}
              <button onClick={next} className="mt-4 w-full bg-gradient-to-r from-primary to-secondary text-on-primary py-3 rounded-xl font-button-text hover:scale-[1.01] active:scale-95 transition-all">{idx + 1 >= queue.length ? 'Ver resultado 🏁' : 'Siguiente →'}</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
