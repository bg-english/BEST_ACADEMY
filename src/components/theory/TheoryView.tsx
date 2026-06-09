'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Topic, StudentTopicProgress } from '@/lib/types'
import GrammarTopic from './GrammarTopic'
import VocabularyTopic from './VocabularyTopic'
import DiscoverTopic from './DiscoverTopic'

interface Props {
  unitId: number
  studentId: string
}

export default function TheoryView({ unitId, studentId }: Props) {
  const [topics, setTopics] = useState<Topic[]>([])
  const [progress, setProgress] = useState<Record<number, boolean>>({})
  const [active, setActive] = useState<Topic | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProgress = useCallback(async () => {
    const { data } = await supabase
      .from('student_topic_progress')
      .select('topic_id, completed')
      .eq('student_id', studentId)
    if (data) {
      const map: Record<number, boolean> = {}
      ;(data as StudentTopicProgress[]).forEach((p) => { map[p.topic_id] = p.completed })
      setProgress(map)
    }
  }, [studentId])

  useEffect(() => {
    supabase.from('topics').select('*').eq('unit_id', unitId).order('order_index')
      .then(({ data }) => { if (data) setTopics(data as Topic[]); setLoading(false) })
    loadProgress()
  }, [unitId, loadProgress])

  const handleComplete = () => { loadProgress() }

  if (active) {
    const common = { topic: active, studentId, onComplete: handleComplete, onBack: () => { setActive(null); loadProgress() } }
    if (active.kind === 'vocabulary') return <VocabularyTopic {...common} />
    if (active.kind === 'discover') return <DiscoverTopic {...common} />
    return <GrammarTopic {...common} />
  }

  if (loading) return <div className="text-center text-on-surface-variant py-10 animate-pulse">Cargando teoría…</div>

  if (topics.length === 0) {
    return (
      <div className="glass-card rounded-3xl p-8 text-center text-on-surface-variant">
        Aún no hay temas de teoría para esta unidad.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
      {topics.map((t) => {
        const k = KIND[t.kind] ?? KIND.grammar
        const done = progress[t.id]
        return (
          <button key={t.id} onClick={() => setActive(t)}
            className="glass-card interactive-card rounded-[32px] p-8 flex flex-col gap-6 group text-left">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform ${k.box}`}>
              <span className="material-symbols-outlined text-[32px] filled-icon">{k.icon}</span>
            </div>
            <div className="flex-1">
              <span className={`font-stat-label text-stat-label px-3 py-1 rounded-full border ${k.chip}`}>{k.tag}</span>
              <h3 className="font-headline-md text-[22px] text-on-surface mt-4">{t.title}</h3>
              {t.explanation && <p className="text-on-surface-variant text-body-md mt-2 line-clamp-2">{t.explanation}</p>}
            </div>
            <div className="mt-auto flex items-center justify-between pt-6 border-t border-white/5">
              <span className={`flex items-center gap-2 font-button-text text-sm ${done ? 'text-tertiary' : 'text-secondary'}`}>
                {done ? '✅ Completo' : '▶ Empezar'}
              </span>
              <span className="material-symbols-outlined text-on-surface-variant group-hover:translate-x-1 transition-transform">chevron_right</span>
            </div>
          </button>
        )
      })}
    </div>
  )
}

const KIND: Record<string, { icon: string; tag: string; box: string; chip: string }> = {
  grammar: { icon: 'book', tag: 'Gramática', box: 'bg-tertiary/10 text-tertiary', chip: 'text-tertiary bg-tertiary/10 border-tertiary/20' },
  vocabulary: { icon: 'translate', tag: 'Vocabulario', box: 'bg-secondary/10 text-secondary', chip: 'text-secondary bg-secondary/10 border-secondary/20' },
  discover: { icon: 'rocket_launch', tag: 'Interactivo', box: 'bg-primary/10 text-primary', chip: 'text-primary bg-primary/10 border-primary/20' },
}
