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
        <button onClick={onBack} className="text-on-surface-variant hover:text-secondary mb-4 flex items-center gap-1 font-button-text text-sm"><span className="material-symbols-outlined text-base">arrow_back</span> Volver a temas</button>
        <div className="glass-card rounded-3xl p-8 text-center text-on-surface-variant">Esta actividad aún no tiene contenido.</div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={onBack} className="text-on-surface-variant hover:text-secondary mb-4 flex items-center gap-1 font-button-text text-sm"><span className="material-symbols-outlined text-base">arrow_back</span> Volver a temas</button>
      <div className="glass-card rounded-3xl p-6 md:p-8">
        <div className="font-stat-label text-stat-label text-primary uppercase tracking-widest mb-1">Descubre · Interactivo</div>
        <h2 className="font-headline-md text-2xl text-on-surface mb-3">{topic.title}</h2>
        {d.instructions && <p className="text-on-surface-variant mb-5">{d.instructions}</p>}

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
      <div className="bg-surface-container-lowest/50 rounded-2xl p-5 mb-4 flex flex-wrap gap-2 justify-center">
        {tokens.map((tok, i) => {
          const n = norm(tok)
          const isTarget = targetWords.has(n)
          const isFound = found.includes(n)
          return (
            <button key={i} onClick={() => tap(tok)}
              className={`px-3 py-1.5 rounded-lg text-lg font-button-text transition ${
                isFound ? 'bg-tertiary text-on-tertiary scale-105' : isTarget ? 'glass-card text-on-surface hover:border-secondary/50' : 'bg-surface-container-high text-on-surface hover:bg-white/10'
              }`}>
              {tok}
            </button>
          )
        })}
      </div>

      {active && (
        <div className="bg-primary/10 border border-primary/30 rounded-2xl p-4 mb-4 text-center">
          <p className="font-button-text text-primary">&quot;{active.word}&quot; → {active.label}</p>
          {active.note && <p className="text-sm text-on-surface-variant mt-1">{active.note}</p>}
        </div>
      )}

      <div className="flex items-center gap-2">
        <div className="flex-1 bg-surface-container rounded-full h-2">
          <div className="bg-gradient-to-r from-tertiary to-secondary h-2 rounded-full transition-all"
            style={{ width: `${(found.length / Math.max(1, targetWords.size)) * 100}%` }} />
        </div>
        <span className="text-xs text-on-surface-variant font-semibold">{found.length}/{targetWords.size} descubiertos</span>
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
            className={`px-3 py-1.5 rounded-lg font-button-text transition ${selected === i ? 'bg-primary text-on-primary scale-105' : 'glass-card text-on-surface hover:border-secondary/50'}`}>
            {it.text}
          </button>
        ))}
        {pool.length === 0 && <p className="text-tertiary font-button-text">¡Todo clasificado! 🎉</p>}
      </div>

      {/* Categorías (toca un elemento y luego su categoría) */}
      <div className={`grid gap-3 ${categories.length <= 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
        {categories.map((cat) => (
          <button key={cat} onClick={() => place(cat)}
            className={`min-h-[90px] rounded-2xl p-3 border-2 border-dashed transition ${wrongCat === cat ? 'border-error bg-error/10' : 'border-outline-variant/40 bg-surface-container-lowest/40 hover:border-secondary/50'}`}>
            <div className="font-headline-md text-on-surface mb-1">{cat}</div>
            <div className="flex flex-wrap gap-1 justify-center">
              {placed[cat].map((it, j) => (
                <span key={j} className="bg-tertiary text-on-tertiary text-sm px-2 py-0.5 rounded">{it.text}</span>
              ))}
            </div>
          </button>
        ))}
      </div>
      <p className="text-xs text-on-surface-variant text-center mt-3">Toca un elemento y luego la categoría correcta.</p>
    </div>
  )
}
