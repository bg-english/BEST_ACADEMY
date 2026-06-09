'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { PracticeExercise, Badge } from '@/lib/types'
import Celebration from '@/components/Celebration'
import { recordProgress } from '@/lib/gamification'
import { playCorrect, playWrong } from '@/lib/sound'
import { speak } from '@/lib/tts'
import { listenOnce, speechSupported, Recognizer } from '@/lib/speech'
import { useLang } from '@/lib/LangContext'

interface Props {
  unitId: number
  studentId: string
}

const norm = (s: string) =>
  s.toLowerCase().trim().replace(/\s+/g, ' ').replace(/[.!?¡¿,]/g, '')

// Coincidencia tolerante para Speaking: acepta si dijo la mayoría de las palabras objetivo
function matchSpeech(transcript: string, target: string): boolean {
  const t = norm(transcript)
  const g = norm(target)
  if (!t) return false
  if (t === g) return true
  const gw = g.split(' ').filter(Boolean)
  const tw = new Set(t.split(' '))
  const hits = gw.filter((w) => tw.has(w)).length
  return gw.length > 0 && hits / gw.length >= 0.7
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

type View = 'map' | 'play' | 'levelDone'

export default function PracticeView({ unitId, studentId }: Props) {
  const { t } = useLang()
  const [exercises, setExercises] = useState<PracticeExercise[]>([])
  const [levelReached, setLevelReached] = useState(0) // último nivel completado
  const [loading, setLoading] = useState(true)

  const [view, setView] = useState<View>('map')
  const [level, setLevel] = useState(1)
  const [queue, setQueue] = useState<PracticeExercise[]>([])
  const [idx, setIdx] = useState(0)
  const [score, setScore] = useState(0)
  const [xp, setXp] = useState(0)
  const [newBadges, setNewBadges] = useState<Badge[]>([])
  const [reviewMode, setReviewMode] = useState(false)
  const [reviewCount, setReviewCount] = useState(0)
  const [adaptiveMode, setAdaptiveMode] = useState(false)
  const [ability, setAbility] = useState(1)
  const seenRef = useRef<Set<number>>(new Set())
  const ADAPT_TOTAL = 12

  // estado por ejercicio
  const [answered, setAnswered] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [chosen, setChosen] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [built, setBuilt] = useState<string[]>([])
  const [bank, setBank] = useState<string[]>([])
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [recording, setRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const recRef = useRef<Recognizer | null>(null)

  // ---- carga ----
  useEffect(() => {
    supabase.from('practice_exercises').select('*').eq('unit_id', unitId).order('level').order('id')
      .then(({ data }) => { if (data) setExercises(data as PracticeExercise[]); setLoading(false) })
    supabase.from('student_practice_stats').select('level_reached').eq('student_id', studentId).eq('unit_id', unitId).eq('area', 'all').maybeSingle()
      .then(({ data }) => { if (data) setLevelReached(data.level_reached) })
  }, [unitId, studentId])

  const levels = useMemo(() => Array.from(new Set(exercises.map((e) => e.level))).sort((a, b) => a - b), [exercises])
  const maxLevel = levels.length ? levels[levels.length - 1] : 1
  const ex = queue[idx]

  // Elige el ejercicio más cercano al nivel objetivo, sin repetir en la sesión
  const pickAdaptive = useCallback((target: number): PracticeExercise | null => {
    const t = Math.max(1, Math.min(maxLevel, Math.round(target)))
    const avail = exercises.filter((e) => !seenRef.current.has(e.id))
    const pool = avail.length ? avail : exercises
    if (pool.length === 0) return null
    const minDist = Math.min(...pool.map((e) => Math.abs(e.level - t)))
    const band = pool.filter((e) => Math.abs(e.level - t) === minDist)
    const choice = band[Math.floor(Math.random() * band.length)]
    seenRef.current.add(choice.id)
    return choice
  }, [exercises, maxLevel])

  const startAdaptive = () => {
    seenRef.current = new Set()
    const startAbility = Math.max(1, Math.min(maxLevel, levelReached || 1))
    setAbility(startAbility)
    const first = pickAdaptive(startAbility)
    if (!first) return
    setAdaptiveMode(true); setReviewMode(false)
    setQueue([first]); setIdx(0); setScore(0); setXp(0); setView('play')
    setupExercise(first)
  }

  const finishAdaptive = async () => {
    const reached = Math.round(ability)
    const newReached = Math.max(levelReached, reached)
    await supabase.from('student_practice_stats').upsert(
      { student_id: studentId, unit_id: unitId, area: 'all', level_reached: newReached,
        total_correct: score, total_answered: queue.length, updated_at: new Date().toISOString() },
      { onConflict: 'student_id,unit_id,area' }
    )
    setLevelReached(newReached)
    if (xp > 0) {
      const { newBadges } = await recordProgress(studentId, xp)
      setNewBadges(newBadges)
    }
  }

  const setupExercise = useCallback((e: PracticeExercise) => {
    setAnswered(false); setIsCorrect(false); setChosen(null); setInput(''); setBuilt([])
    setTranscript(''); setRecording(false)
    if (e.type === 'reorder') setBank(shuffle(e.payload.words || []))
    else setBank([])
    setTimeLeft(e.timed && e.time_limit_seconds ? e.time_limit_seconds : null)
  }, [])

  const startLevel = (lvl: number) => {
    const q = exercises.filter((e) => e.level === lvl)
    setLevel(lvl); setQueue(q); setIdx(0); setScore(0); setXp(0); setView('play')
    if (q[0]) setupExercise(q[0])
  }

  const grade = (answer: string) => {
    if (answered || !ex) return
    const ok =
      ex.type === 'speaking'
        ? matchSpeech(answer, ex.correct_answer)
        : ex.type === 'fill_blank' || ex.type === 'listening'
        ? norm(answer) === norm(ex.correct_answer) || (ex.payload.accept || []).some((a) => norm(a) === norm(answer))
        : norm(answer) === norm(ex.correct_answer)
    setAnswered(true); setIsCorrect(ok); setChosen(answer)
    if (ok) { setScore((s) => s + 1); setXp((x) => x + ex.xp_reward); playCorrect() }
    else playWrong()
    // Dificultad adaptativa: sube si acierta (más si fue rápido), baja si falla
    if (adaptiveMode) {
      const fast = ex.timed && timeLeft !== null && timeLeft > (ex.time_limit_seconds || 0) * 0.4
      const delta = ok ? (fast ? 0.45 : 0.3) : -0.45
      setAbility((a) => Math.max(1, Math.min(maxLevel, a + delta)))
    }
    // Registrar el intento (para el repaso de errores). Fire-and-forget.
    supabase.from('student_practice_attempts').insert({ student_id: studentId, exercise_id: ex.id, is_correct: ok })
  }

  const startSpeak = () => {
    if (answered || recording) return
    setRecording(true); setTranscript('')
    recRef.current = listenOnce(
      (t) => { setRecording(false); setTranscript(t); grade(t) },
      () => { setRecording(false) }
    )
  }

  // Calcula los ejercicios a repasar: aquellos cuyo ÚLTIMO intento fue incorrecto
  const computeReview = useCallback(async (): Promise<PracticeExercise[]> => {
    const { data: att } = await supabase
      .from('student_practice_attempts')
      .select('exercise_id, is_correct, created_at')
      .eq('student_id', studentId)
      .order('created_at', { ascending: true })
    if (!att || att.length === 0) return []
    const latest: Record<number, boolean> = {}
    att.forEach((a: { exercise_id: number; is_correct: boolean }) => { latest[a.exercise_id] = a.is_correct })
    const wrongIds = new Set(Object.entries(latest).filter(([, ok]) => !ok).map(([id]) => Number(id)))
    return exercises.filter((e) => wrongIds.has(e.id))
  }, [studentId, exercises])

  useEffect(() => {
    if (exercises.length) computeReview().then((r) => setReviewCount(r.length))
  }, [exercises, computeReview])

  const startReview = async () => {
    const q = await computeReview()
    if (q.length === 0) return
    setReviewMode(true); setQueue(q); setIdx(0); setScore(0); setXp(0); setView('play')
    setupExercise(q[0])
  }

  const goMap = async () => {
    setReviewMode(false)
    setAdaptiveMode(false)
    setView('map')
    const r = await computeReview()
    setReviewCount(r.length)
  }

  // temporizador en niveles con tiempo
  useEffect(() => {
    if (view !== 'play' || timeLeft === null || answered) return
    if (timeLeft <= 0) { grade('') ; return }
    const t = setTimeout(() => setTimeLeft((s) => (s === null ? null : s - 1)), 1000)
    return () => clearTimeout(t)
  }, [timeLeft, answered, view]) // eslint-disable-line react-hooks/exhaustive-deps

  const PASS_PCT = 60

  const finishLevel = async () => {
    if (reviewMode) return // el repaso no cambia niveles ni otorga XP
    const acc = queue.length ? Math.round((score / queue.length) * 100) : 0
    const passed = acc >= PASS_PCT
    const firstTime = level > levelReached
    // Solo se desbloquea el siguiente nivel si DEMUESTRA dominio (>= 60%)
    const newReached = passed && firstTime ? level : levelReached

    // Guardar estadística primero (para que los logros vean el nivel alcanzado)
    await supabase.from('student_practice_stats').upsert(
      { student_id: studentId, unit_id: unitId, area: 'all', level_reached: newReached,
        total_correct: score, total_answered: queue.length, updated_at: new Date().toISOString() },
      { onConflict: 'student_id,unit_id,area' }
    )
    setLevelReached(newReached)

    // XP + racha + logros: solo la primera vez que se aprueba un nivel (evita "farmear")
    if (passed && firstTime && xp > 0) {
      const { newBadges } = await recordProgress(studentId, xp)
      setNewBadges(newBadges)
    }
  }

  const next = () => {
    if (adaptiveMode) {
      if (idx + 1 >= ADAPT_TOTAL) {
        finishAdaptive()
        setView('levelDone')
      } else {
        const picked = pickAdaptive(ability)
        if (!picked) { finishAdaptive(); setView('levelDone'); return }
        const nq = [...queue, picked]
        setQueue(nq); setIdx(idx + 1); setupExercise(picked)
      }
      return
    }
    if (idx + 1 >= queue.length) {
      finishLevel()
      setView('levelDone')
    } else {
      const ni = idx + 1
      setIdx(ni); setupExercise(queue[ni])
    }
  }

  if (loading) return <div className="text-center text-on-surface-variant py-10 animate-pulse">Cargando práctica…</div>
  if (levels.length === 0) {
    return <div className="max-w-2xl mx-auto glass-card rounded-3xl p-8 text-center text-on-surface-variant">Aún no hay ejercicios de práctica para esta unidad.</div>
  }

  // ---- MAPA DE NIVELES ----
  if (view === 'map') {
    return (
      <div>
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 mb-8">
          <div>
            <span className="font-stat-label text-secondary uppercase tracking-widest text-xs">{t('Tu camino', 'Learning journey')}</span>
            <h2 className="font-headline-md text-3xl md:text-display-lg-mobile text-on-surface">{t('Dominio', 'Mastery')}: {t('Nivel', 'Level')} {levelReached} {t('de', 'of')} {levels.length}</h2>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            {reviewCount > 0 && (
              <button onClick={startReview}
                className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-amber-400/10 border border-amber-400/30 hover:border-amber-400/60 hover:-translate-y-0.5 active:scale-95 transition-all">
                <span className="material-symbols-outlined text-amber-400">history</span>
                <div className="text-left">
                  <p className="font-button-text text-on-surface text-sm">{t('Repasar mis errores', 'Review my mistakes')} ({reviewCount})</p>
                  <p className="text-[10px] text-amber-400/80 uppercase font-stat-label">{t('pendientes', 'pending')}</p>
                </div>
              </button>
            )}
            <button onClick={startAdaptive}
              className="relative px-6 py-4 rounded-2xl bg-gradient-to-r from-primary-container to-secondary-container glow-cyan hover:-translate-y-0.5 active:scale-95 transition-all flex items-center gap-3">
              <span className="text-2xl">🎯</span>
              <div className="text-left">
                <p className="font-headline-md text-white leading-tight">{t('Práctica adaptativa', 'Adaptive practice')}</p>
                <p className="font-body-md text-xs text-white/80">{t('se ajusta a tu nivel', 'adjusts to your level')}</p>
              </div>
            </button>
          </div>
        </div>

        <div className="glass-card rounded-[2.5rem] p-6 md:p-10">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 justify-items-center">
            {levels.map((lvl) => {
              const unlocked = lvl <= levelReached + 1
              const done = lvl <= levelReached
              const current = lvl === levelReached + 1
              const timed = exercises.some((e) => e.level === lvl && e.timed)
              return (
                <button key={lvl} disabled={!unlocked} onClick={() => startLevel(lvl)}
                  className="flex flex-col items-center gap-3 group disabled:cursor-not-allowed">
                  <div className={`rounded-full flex items-center justify-center border-4 transition-transform ${
                    done ? 'w-20 h-20 bg-tertiary-container border-tertiary glow-lime group-hover:scale-110'
                    : current ? 'w-24 h-24 bg-gradient-to-br from-secondary to-primary-container border-white glow-cyan group-hover:scale-110 animate-pulse'
                    : 'w-20 h-20 bg-surface-container-highest border-outline-variant opacity-50'}`}>
                    <span className={`material-symbols-outlined filled-icon ${done ? 'text-tertiary text-4xl' : current ? 'text-white text-5xl' : 'text-outline text-4xl'}`}>
                      {done ? 'star' : current ? (timed ? 'timer' : 'play_arrow') : 'lock'}
                    </span>
                  </div>
                  <div className="text-center">
                    <p className={`font-stat-label text-xs ${done ? 'text-tertiary' : current ? 'text-secondary' : 'text-outline'}`}>{t('NIVEL', 'LEVEL')} {lvl}</p>
                    <p className="font-headline-md text-on-surface text-sm">{timed ? t('con tiempo', 'timed') : t('práctica', 'practice')}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // ---- NIVEL / REPASO / ADAPTATIVA COMPLETADO ----
  if (view === 'levelDone') {
    const acc = queue.length ? Math.round((score / queue.length) * 100) : 0
    if (adaptiveMode) {
      const reached = Math.round(ability)
      return (
        <Celebration
          show
          sound="level"
          emoji={reached >= maxLevel ? '🏆' : reached >= 3 ? '🎯' : '💪'}
          title="¡Práctica adaptativa completada!"
          subtitle={`Tu nivel de dominio: Nivel ${reached} de ${maxLevel}`}
          stats={[{ label: 'Aciertos', value: `${score}/${queue.length} (${acc}%)` }, { label: 'XP', value: `+${xp}` }]}
          badges={newBadges.map((b) => ({ name: b.name, icon: b.icon }))}
          buttonLabel={t('Volver al mapa', 'Back to map')}
          onClose={goMap}
        />
      )
    }
    if (reviewMode) {
      return (
        <Celebration
          show
          sound="topic"
          emoji={acc >= 80 ? '🌟' : '💪'}
          title="¡Repaso completado!"
          subtitle={acc >= 80 ? '¡Cada vez lo dominas más!' : '¡Sigue repasando, vas mejorando!'}
          stats={[{ label: 'Aciertos', value: `${score}/${queue.length} (${acc}%)` }]}
          buttonLabel={t('Volver al mapa', 'Back to map')}
          onClose={goMap}
        />
      )
    }
    const passed = acc >= 60
    return (
      <Celebration
        show
        sound="level"
        emoji={acc >= 80 ? '🏆' : passed ? '🎉' : '💪'}
        title={passed ? `¡Nivel ${level} superado!` : `¡Casi, nivel ${level}!`}
        subtitle={
          acc >= 80 ? '¡Dominaste este nivel!'
          : passed ? '¡Siguiente nivel desbloqueado!'
          : 'Necesitas 60% para desbloquear el siguiente nivel. ¡Inténtalo otra vez, tú puedes!'
        }
        stats={[{ label: 'Aciertos', value: `${score}/${queue.length} (${acc}%)` }, { label: 'XP', value: `+${xp}` }]}
        badges={newBadges.map((b) => ({ name: b.name, icon: b.icon }))}
        buttonLabel={t('Volver al mapa', 'Back to map')}
        onClose={goMap}
      />
    )
  }

  // ---- JUGANDO ----
  if (!ex) return null
  const optCls = (correct: boolean, wrong: boolean) =>
    `w-full text-left px-5 py-4 rounded-2xl font-button-text border transition-all ${
      correct ? 'border-tertiary bg-tertiary/10 text-tertiary'
      : wrong ? 'border-error bg-error/10 text-error'
      : 'glass-card border-white/10 hover:border-secondary/50 hover:scale-[1.01] text-on-surface'}`
  const checkBtn = 'mt-4 w-full bg-gradient-to-r from-primary to-secondary text-on-primary py-3 rounded-xl font-button-text hover:scale-[1.01] active:scale-95 transition-all'
  const inputCls = 'w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-4 py-3 text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/40 placeholder:text-outline/50'

  return (
    <div className="max-w-3xl mx-auto">
      <button onClick={goMap} className="text-on-surface-variant hover:text-secondary mb-4 flex items-center gap-1 font-button-text text-sm">
        <span className="material-symbols-outlined text-base">close</span> {t('Salir', 'Exit')}
      </button>
      <div className="glass-card rounded-3xl p-6 md:p-8">
        <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
          <span className="font-stat-label text-stat-label text-primary uppercase tracking-widest">
            {adaptiveMode ? '🎯 Adaptativa' : reviewMode ? '🔁 Repaso' : `${t('Nivel', 'Level')} ${level}`} · {idx + 1}/{adaptiveMode ? ADAPT_TOTAL : queue.length}
          </span>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-surface-container-high border border-white/10 text-xs capitalize text-on-surface-variant">{ex.area}</span>
            {timeLeft !== null && (
              <span className={`px-3 py-1 rounded-full bg-secondary/10 border border-secondary/20 font-stat-label text-stat-label flex items-center gap-1 ${timeLeft <= 3 ? 'text-error' : 'text-secondary'}`}>
                <span className="material-symbols-outlined text-[16px]">timer</span>{timeLeft}s
              </span>
            )}
          </div>
        </div>
        {adaptiveMode && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-on-surface-variant mb-1">
              <span className="font-stat-label uppercase">Dificultad</span>
              <span className="font-semibold text-secondary">Nivel {Math.round(ability)}</span>
            </div>
            <div className="w-full bg-surface-container rounded-full h-1.5">
              <div className="bg-gradient-to-r from-tertiary to-secondary h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${(ability / maxLevel) * 100}%` }} />
            </div>
          </div>
        )}
        <p className="font-headline-md text-xl text-on-surface mb-5">{ex.prompt}</p>

        {/* OPCIÓN MÚLTIPLE */}
        {ex.type === 'multiple_choice' && (
          <div className="space-y-3">
            {(ex.payload.options || []).map((opt) => (
              <button key={opt} disabled={answered} onClick={() => grade(opt)}
                className={optCls(!!answered && norm(opt) === norm(ex.correct_answer), !!answered && opt === chosen && norm(opt) !== norm(ex.correct_answer))}>{opt}</button>
            ))}
          </div>
        )}

        {/* VERDADERO / FALSO */}
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

        {/* COMPLETAR (escribir) */}
        {ex.type === 'fill_blank' && (
          <div>
            <input value={input} onChange={(e) => setInput(e.target.value)} disabled={answered}
              onKeyDown={(e) => { if (e.key === 'Enter' && !answered && input.trim()) grade(input) }}
              placeholder="Escribe tu respuesta…" className={inputCls} />
            {!answered && <button onClick={() => input.trim() && grade(input)} className={checkBtn}>{t('Comprobar', 'Check')}</button>}
          </div>
        )}

        {/* ORDENAR PALABRAS */}
        {ex.type === 'reorder' && (
          <div>
            <div className="min-h-[52px] border-2 border-dashed border-white/10 rounded-xl p-2 mb-3 flex flex-wrap gap-2 bg-surface-container-lowest/50">
              {built.map((w, i) => (
                <button key={i} disabled={answered} onClick={() => { setBuilt(built.filter((_, j) => j !== i)); setBank([...bank, w]) }}
                  className="bg-secondary/15 text-secondary px-3 py-1.5 rounded-lg font-button-text">{w}</button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {bank.map((w, i) => (
                <button key={i} disabled={answered} onClick={() => { setBuilt([...built, w]); setBank(bank.filter((_, j) => j !== i)) }}
                  className="bg-surface-container-high text-on-surface px-3 py-1.5 rounded-lg font-button-text hover:bg-white/10">{w}</button>
              ))}
            </div>
            {!answered && <button onClick={() => grade(built.join(' '))} disabled={built.length === 0} className={`${checkBtn} disabled:opacity-50`}>{t('Comprobar', 'Check')}</button>}
          </div>
        )}

        {/* LISTENING (escuchar y responder; el texto no se muestra) */}
        {ex.type === 'listening' && (
          <div>
            <button type="button" onClick={() => speak(ex.payload.audio || ex.correct_answer)}
              className="mb-4 w-full bg-gradient-to-r from-primary-container to-secondary-container text-on-primary-fixed py-3.5 rounded-xl font-button-text hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2">
              <span className="material-symbols-outlined filled-icon">volume_up</span> Escuchar {answered ? '' : '(toca para repetir)'}
            </button>
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
                {!answered && <button onClick={() => input.trim() && grade(input)} className={checkBtn}>{t('Comprobar', 'Check')}</button>}
              </div>
            )}
          </div>
        )}

        {/* SPEAKING (di la frase; se transcribe y compara) */}
        {ex.type === 'speaking' && (
          <div className="text-center">
            <div className="glass-card rounded-2xl p-5 mb-5 flex items-center justify-center gap-3">
              <span className="font-headline-md text-xl text-on-surface">{ex.payload.target || ex.correct_answer}</span>
              <button type="button" onClick={() => speak(ex.payload.target || ex.correct_answer)} className="text-secondary">
                <span className="material-symbols-outlined">volume_up</span>
              </button>
            </div>
            {speechSupported() ? (
              <>
                {!answered && (
                  <button onClick={startSpeak} disabled={recording}
                    className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center text-white transition-all ${recording ? 'bg-error animate-pulse shadow-[0_0_30px_rgba(255,180,171,0.5)]' : 'bg-gradient-to-tr from-primary to-secondary hover:scale-110 active:scale-95 shadow-lg shadow-primary/30'}`}>
                    <span className="material-symbols-outlined text-4xl filled-icon">mic</span>
                  </button>
                )}
                <p className="text-on-surface-variant text-sm mt-3">{recording ? '🎙️ Escuchando… ¡habla ahora!' : 'Toca el micrófono y habla'}</p>
                {transcript && <p className="mt-2 text-sm text-on-surface-variant">Dijiste: <span className="font-medium text-on-surface">&quot;{transcript}&quot;</span></p>}
              </>
            ) : (
              <>
                <p className="text-sm text-on-surface-variant mb-3">Tu navegador no permite el micrófono. Léela en voz alta y márcala.</p>
                {!answered && <button onClick={() => grade(ex.correct_answer)} className={checkBtn}>✓ Ya la practiqué</button>}
              </>
            )}
          </div>
        )}

        {/* FEEDBACK */}
        {answered && (
          <div className={`mt-5 p-5 rounded-2xl border ${isCorrect ? 'bg-tertiary-container/20 border-tertiary/30' : 'bg-error-container/10 border-error/30'}`}>
            <p className="font-button-text mb-1 flex items-center gap-2">
              <span className={`material-symbols-outlined ${isCorrect ? 'text-tertiary' : 'text-error'}`}>{isCorrect ? 'check_circle' : 'cancel'}</span>
              {isCorrect ? t('¡Correcto!', 'Correct!') : `${t('La respuesta correcta es:', 'The correct answer is:')} "${ex.correct_answer}"`}
            </p>
            {ex.explanation && <p className="text-sm text-on-surface-variant ml-8">{ex.explanation}</p>}
            <button onClick={next} className="mt-4 w-full bg-gradient-to-r from-primary to-secondary text-on-primary py-3 rounded-xl font-button-text hover:scale-[1.01] active:scale-95 transition-all">
              {idx + 1 >= queue.length ? t('Ver resultado 🏆', 'See result 🏆') : t('Siguiente →', 'Next →')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
