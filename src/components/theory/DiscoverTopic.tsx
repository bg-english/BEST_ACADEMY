'use client'

import { useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Topic, DiscoverData } from '@/lib/types'
import Celebration from '@/components/Celebration'
import { playCorrect, playWrong } from '@/lib/sound'
import { recordProgress } from '@/lib/gamification'

interface Props {
  topic: Topic
  studentId: string
  onComplete: () => void
  onBack: () => void
}

const norm = (s: string) => s.toLowerCase().trim().replace(/[.!?¡¿,]/g, '')

function shuffle<T>(a: T[]): T[] { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]] } return a }

export default function DiscoverTopic({ topic, studentId, onComplete, onBack }: Props) {
  const d: DiscoverData | undefined = topic.discover
  const [done, setDone] = useState(false)

  const finish = async () => {
    const { data: prev } = await supabase.from('student_topic_progress')
      .select('completed').eq('student_id', studentId).eq('topic_id', topic.id).maybeSingle()
    await supabase.from('student_topic_progress').upsert(
      { student_id: studentId, topic_id: topic.id, completed: true, completed_at: new Date().toISOString() },
      { onConflict: 'student_id,topic_id' }
    )
    if (!prev?.completed) await recordProgress(studentId, 35) // XP + logros solo la 1ª vez
    onComplete()
    setDone(true)
  }

  if (!d) {
    return (
      <div className="max-w-2xl mx-auto">
        <button onClick={onBack} className="text-blue-200 hover:text-white mb-3">← Volver a temas</button>
        <div className="bg-white rounded-3xl p-8 text-center text-gray-500">Esta actividad aún no tiene contenido.</div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={onBack} className="text-blue-200 hover:text-white mb-3">← Volver a temas</button>
      <div className="bg-white rounded-3xl p-6 shadow-2xl">
        <div className="text-xs font-bold text-fuchsia-500 uppercase mb-1">Descubre · Interactivo</div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-3">{topic.title}</h2>
        {d.instructions && <p className="text-gray-600 mb-4">{d.instructions}</p>}

        {d.type === 'tap' ? (
          <TapDiscover d={d} onAllFound={finish} />
        ) : (
          <SortDiscover d={d} onAllSorted={finish} />
        )}
      </div>

      <Celebration
        show={done}
        emoji="🧠"
        sound="topic"
        title="¡Concepto descubierto!"
        subtitle={d.conclusion || topic.title}
        buttonLabel="Volver a temas"
        onClose={onBack}
      />
    </div>
  )
}

// ---- Modo TAP: toca palabras para descubrir conceptos ----
function TapDiscover({ d, onAllFound }: { d: DiscoverData; onAllFound: () => void }) {
  const tokens = (d.sentence || '').split(' ')
  const targets = d.targets || []
  const [found, setFound] = useState<string[]>([]) // normalized words found
  const [active, setActive] = useState<{ word: string; label: string; note?: string } | null>(null)

  const targetWords = useMemo(() => new Set(targets.map((t) => norm(t.word))), [targets])

  const tap = (word: string) => {
    const n = norm(word)
    if (!targetWords.has(n)) { playWrong(); return }
    const t = targets.find((x) => norm(x.word) === n)!
    setActive(t)
    if (!found.includes(n)) {
      const nf = [...found, n]
      setFound(nf)
      playCorrect()
      if (nf.length >= targetWords.size) setTimeout(onAllFound, 800)
    }
  }

  return (
    <div>
      <div className="bg-indigo-50 rounded-2xl p-5 mb-4 flex flex-wrap gap-2 justify-center">
        {tokens.map((tok, i) => {
          const n = norm(tok)
          const isTarget = targetWords.has(n)
          const isFound = found.includes(n)
          return (
            <button key={i} onClick={() => tap(tok)}
              className={`px-3 py-1.5 rounded-lg text-lg font-medium transition ${
                isFound ? 'bg-green-500 text-white scale-105' : isTarget ? 'bg-white text-gray-800 hover:bg-fuchsia-100 shadow' : 'bg-white text-gray-800 hover:bg-gray-100'
              }`}>
              {tok}
            </button>
          )
        })}
      </div>

      {active && (
        <div className="bg-fuchsia-50 border border-fuchsia-200 rounded-2xl p-4 mb-4 text-center">
          <p className="font-bold text-fuchsia-700">&quot;{active.word}&quot; → {active.label}</p>
          {active.note && <p className="text-sm text-gray-600 mt-1">{active.note}</p>}
        </div>
      )}

      <div className="flex items-center gap-2">
        <div className="flex-1 bg-gray-200 rounded-full h-2">
          <div className="bg-gradient-to-r from-fuchsia-500 to-purple-600 h-2 rounded-full transition-all"
            style={{ width: `${(found.length / Math.max(1, targetWords.size)) * 100}%` }} />
        </div>
        <span className="text-xs text-gray-500 font-semibold">{found.length}/{targetWords.size} descubiertos</span>
      </div>
    </div>
  )
}

// ---- Modo SORT: clasifica elementos en categorías ----
function SortDiscover({ d, onAllSorted }: { d: DiscoverData; onAllSorted: () => void }) {
  const categories = d.categories || []
  const initial = useMemo(() => shuffle(d.items || []), [d.items])
  const [pool, setPool] = useState(initial)
  const [placed, setPlaced] = useState<Record<string, { text: string }[]>>(() => Object.fromEntries(categories.map((c) => [c, []])))
  const [selected, setSelected] = useState<number | null>(null)
  const [wrongCat, setWrongCat] = useState<string | null>(null)

  const place = (cat: string) => {
    if (selected === null) return
    const item = pool[selected]
    if (item.category === cat) {
      playCorrect()
      const np = pool.filter((_, i) => i !== selected)
      setPool(np); setSelected(null)
      setPlaced((p) => ({ ...p, [cat]: [...p[cat], { text: item.text }] }))
      if (np.length === 0) setTimeout(onAllSorted, 700)
    } else {
      playWrong(); setWrongCat(cat); setTimeout(() => setWrongCat(null), 400)
    }
  }

  return (
    <div>
      {/* Pool de elementos */}
      <div className="flex flex-wrap gap-2 justify-center mb-5 min-h-[40px]">
        {pool.map((it, i) => (
          <button key={it.text + i} onClick={() => setSelected(i)}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${selected === i ? 'bg-fuchsia-600 text-white scale-105' : 'bg-white text-gray-800 shadow hover:bg-fuchsia-50'}`}>
            {it.text}
          </button>
        ))}
        {pool.length === 0 && <p className="text-green-600 font-semibold">¡Todo clasificado! 🎉</p>}
      </div>

      {/* Categorías (toca un elemento y luego su categoría) */}
      <div className={`grid gap-3 ${categories.length <= 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
        {categories.map((cat) => (
          <button key={cat} onClick={() => place(cat)}
            className={`min-h-[90px] rounded-2xl p-3 border-2 border-dashed transition ${wrongCat === cat ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-gray-50 hover:border-fuchsia-400'}`}>
            <div className="font-bold text-gray-700 mb-1">{cat}</div>
            <div className="flex flex-wrap gap-1 justify-center">
              {placed[cat].map((it, j) => (
                <span key={j} className="bg-green-500 text-white text-sm px-2 py-0.5 rounded">{it.text}</span>
              ))}
            </div>
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-400 text-center mt-3">Toca un elemento y luego la categoría correcta.</p>
    </div>
  )
}
