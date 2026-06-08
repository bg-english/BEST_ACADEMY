'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { PracticeExercise, Badge } from '@/lib/types'
import Celebration from '@/components/Celebration'
import { recordProgress } from '@/lib/gamification'
import { playCorrect, playWrong } from '@/lib/sound'

interface Props {
  unitId: number
  studentId: string
}

const norm = (s: string) =>
  s.toLowerCase().trim().replace(/\s+/g, ' ').replace(/[.!?¡¿,]/g, '')

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
      ex.type === 'fill_blank'
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

  if (loading) return <div className="text-center text-blue-200 py-10">Cargando práctica…</div>
  if (levels.length === 0) {
    return <div className="max-w-2xl mx-auto bg-white/10 rounded-2xl p-8 text-center text-blue-100">Aún no hay ejercicios de práctica para esta unidad.</div>
  }

  // ---- MAPA DE NIVELES ----
  if (view === 'map') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="text-center text-blue-100 mb-4">
          Tu dominio: <span className="font-bold text-white">Nivel {levelReached} de {levels.length}</span>
        </div>

        <button onClick={startAdaptive}
          className="w-full mb-4 bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white font-bold py-3 rounded-2xl shadow-lg hover:opacity-90 transition">
          🎯 Práctica adaptativa <span className="font-normal opacity-90">— se ajusta a tu nivel</span>
        </button>

        <div className="text-center text-blue-200 text-sm mb-2">o elige un nivel:</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {levels.map((lvl) => {
            const unlocked = lvl <= levelReached + 1
            const done = lvl <= levelReached
            const timed = exercises.some((e) => e.level === lvl && e.timed)
            return (
              <button key={lvl} disabled={!unlocked} onClick={() => startLevel(lvl)}
                className={`rounded-2xl p-4 text-center shadow-lg transition ${unlocked ? 'bg-white hover:shadow-xl' : 'bg-white/30 cursor-not-allowed'}`}>
                <div className="text-3xl mb-1">{done ? '⭐' : unlocked ? (timed ? '⏱️' : '▶️') : '🔒'}</div>
                <div className={`font-bold ${unlocked ? 'text-gray-800' : 'text-white/70'}`}>Nivel {lvl}</div>
                <div className={`text-xs ${unlocked ? 'text-gray-400' : 'text-white/50'}`}>{timed ? 'con tiempo' : 'práctica'}</div>
              </button>
            )
          })}
        </div>

        {reviewCount > 0 && (
          <button onClick={startReview}
            className="mt-5 w-full bg-amber-400 hover:bg-amber-500 text-amber-950 font-bold py-3 rounded-2xl shadow-lg transition">
            🔁 Repasar mis errores ({reviewCount})
          </button>
        )}
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
          buttonLabel="Volver al mapa"
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
          buttonLabel="Volver al mapa"
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
        buttonLabel="Volver al mapa"
        onClose={goMap}
      />
    )
  }

  // ---- JUGANDO ----
  if (!ex) return null
  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={goMap} className="text-blue-200 hover:text-white mb-3">← Salir</button>
      <div className="bg-white rounded-3xl p-5 shadow-2xl">
        <div className="flex justify-between items-center text-sm text-gray-500 mb-2">
          <span>{adaptiveMode ? '🎯 Adaptativa' : reviewMode ? '🔁 Repaso' : `Nivel ${level}`} · {idx + 1}/{adaptiveMode ? ADAPT_TOTAL : queue.length}</span>
          <span className="capitalize">{ex.area}</span>
          {timeLeft !== null && (
            <span className={`font-bold ${timeLeft <= 3 ? 'text-red-500' : 'text-blue-600'}`}>⏱️ {timeLeft}s</span>
          )}
        </div>
        {adaptiveMode && (
          <div className="mb-3">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Dificultad</span>
              <span className="font-semibold text-purple-600">Nivel {Math.round(ability)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div className="bg-gradient-to-r from-fuchsia-500 to-purple-600 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${(ability / maxLevel) * 100}%` }} />
            </div>
          </div>
        )}
        <p className="text-lg font-semibold text-gray-800 mb-4">{ex.prompt}</p>

        {/* OPCIÓN MÚLTIPLE */}
        {ex.type === 'multiple_choice' && (
          <div className="space-y-2">
            {(ex.payload.options || []).map((opt) => {
              let s = 'border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50'
              if (answered && norm(opt) === norm(ex.correct_answer)) s = 'border-2 border-green-500 bg-green-50'
              else if (answered && opt === chosen) s = 'border-2 border-red-400 bg-red-50'
              return (
                <button key={opt} disabled={answered} onClick={() => grade(opt)}
                  className={`w-full text-left px-4 py-2.5 rounded-xl font-medium transition ${s}`}>{opt}</button>
              )
            })}
          </div>
        )}

        {/* VERDADERO / FALSO */}
        {ex.type === 'true_false' && (
          <div className="grid grid-cols-2 gap-3">
            {['true', 'false'].map((v) => {
              let s = 'border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50'
              if (answered && v === norm(ex.correct_answer)) s = 'border-2 border-green-500 bg-green-50'
              else if (answered && v === chosen) s = 'border-2 border-red-400 bg-red-50'
              return (
                <button key={v} disabled={answered} onClick={() => grade(v)}
                  className={`px-4 py-3 rounded-xl font-bold transition ${s}`}>{v === 'true' ? '✔ Verdadero' : '✗ Falso'}</button>
              )
            })}
          </div>
        )}

        {/* COMPLETAR (escribir) */}
        {ex.type === 'fill_blank' && (
          <div>
            <input value={input} onChange={(e) => setInput(e.target.value)} disabled={answered}
              onKeyDown={(e) => { if (e.key === 'Enter' && !answered && input.trim()) grade(input) }}
              placeholder="Escribe tu respuesta…"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500" />
            {!answered && (
              <button onClick={() => input.trim() && grade(input)}
                className="mt-3 w-full bg-blue-600 text-white py-2.5 rounded-xl font-bold hover:bg-blue-700">Comprobar</button>
            )}
          </div>
        )}

        {/* ORDENAR PALABRAS */}
        {ex.type === 'reorder' && (
          <div>
            <div className="min-h-[48px] border-2 border-dashed border-gray-200 rounded-xl p-2 mb-3 flex flex-wrap gap-2">
              {built.map((w, i) => (
                <button key={i} disabled={answered} onClick={() => { setBuilt(built.filter((_, j) => j !== i)); setBank([...bank, w]) }}
                  className="bg-blue-100 text-blue-800 px-3 py-1 rounded-lg font-medium">{w}</button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {bank.map((w, i) => (
                <button key={i} disabled={answered} onClick={() => { setBuilt([...built, w]); setBank(bank.filter((_, j) => j !== i)) }}
                  className="bg-gray-100 text-gray-800 px-3 py-1 rounded-lg font-medium hover:bg-gray-200">{w}</button>
              ))}
            </div>
            {!answered && (
              <button onClick={() => grade(built.join(' '))} disabled={built.length === 0}
                className="mt-3 w-full bg-blue-600 text-white py-2.5 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50">Comprobar</button>
            )}
          </div>
        )}

        {/* FEEDBACK */}
        {answered && (
          <div className={`mt-4 p-4 rounded-xl ${isCorrect ? 'bg-green-50' : 'bg-amber-50'}`}>
            <p className="font-semibold mb-1">{isCorrect ? '✅ ¡Correcto!' : `❌ La respuesta correcta es: "${ex.correct_answer}"`}</p>
            {ex.explanation && <p className="text-sm text-gray-600">{ex.explanation}</p>}
            <button onClick={next} className="mt-3 w-full bg-blue-600 text-white py-2.5 rounded-xl font-bold hover:bg-blue-700">
              {idx + 1 >= queue.length ? 'Ver resultado 🏆' : 'Siguiente →'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
