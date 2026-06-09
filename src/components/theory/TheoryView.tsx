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

  if (loading) return <div className="text-center text-blue-200 py-10">Cargando teoría…</div>

  if (topics.length === 0) {
    return (
      <div className="bg-white/10 rounded-2xl p-8 text-center text-blue-100">
        Aún no hay temas de teoría para esta unidad.
      </div>
    )
  }

  return (
    <div className="space-y-3 max-w-2xl mx-auto">
      {topics.map((t) => (
        <button key={t.id} onClick={() => setActive(t)}
          className="w-full text-left bg-white rounded-2xl p-4 shadow-lg hover:shadow-xl transition flex items-center gap-4">
          <div className="text-3xl">{t.kind === 'vocabulary' ? '🗂️' : t.kind === 'discover' ? '🧩' : '📐'}</div>
          <div className="flex-1">
            <div className="text-xs font-bold uppercase text-purple-500">
              {t.kind === 'vocabulary' ? 'Vocabulario' : t.kind === 'discover' ? 'Descubre' : 'Gramática'}
            </div>
            <div className="font-bold text-gray-800">{t.title}</div>
          </div>
          {progress[t.id] ? <span className="text-2xl">✅</span> : <span className="text-gray-300 text-2xl">▶</span>}
        </button>
      ))}
    </div>
  )
}
