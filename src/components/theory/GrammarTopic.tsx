'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Topic, TopicExample, TopicPractice } from '@/lib/types'
import Celebration from '@/components/Celebration'
import { recordProgress } from '@/lib/gamification'
import { playCorrect, playWrong } from '@/lib/sound'
import SpeakButton from '@/components/SpeakButton'
import { Badge } from '@/lib/types'

interface Props {
  topic: Topic
  studentId: string
  onComplete: () => void
  onBack: () => void
}

type Phase = 'learn' | 'practice' | 'done'

export default function GrammarTopic({ topic, studentId, onComplete, onBack }: Props) {
  const [examples, setExamples] = useState<TopicExample[]>([])
  const [practice, setPractice] = useState<TopicPractice[]>([])
  const [phase, setPhase] = useState<Phase>('learn')
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [answered, setAnswered] = useState(false)
  const [score, setScore] = useState(0)
  const [newBadges, setNewBadges] = useState<Badge[]>([])

  useEffect(() => {
    supabase.from('topic_examples').select('*').eq('topic_id', topic.id).order('order_index')
      .then(({ data }) => { if (data) setExamples(data as TopicExample[]) })
    supabase.from('topic_practice').select('*').eq('topic_id', topic.id).order('order_index')
      .then(({ data }) => { if (data) setPractice(data as TopicPractice[]) })
  }, [topic.id])

  const markComplete = async () => {
    const { data: existing } = await supabase
      .from('student_topic_progress')
      .select('completed').eq('student_id', studentId).eq('topic_id', topic.id).maybeSingle()
    await supabase.from('student_topic_progress').upsert(
      { student_id: studentId, topic_id: topic.id, completed: true, completed_at: new Date().toISOString() },
      { onConflict: 'student_id,topic_id' }
    )
    if (!existing?.completed) {
      const { newBadges } = await recordProgress(studentId, 30) // XP + racha + logros, solo la 1ª vez
      setNewBadges(newBadges)
    }
    onComplete()
  }

  const q = practice[current]

  const answer = (opt: string) => {
    if (answered) return
    setSelected(opt)
    setAnswered(true)
    if (opt === q.correct_answer) { setScore((s) => s + 1); playCorrect() }
    else playWrong()
  }

  const next = () => {
    if (current + 1 >= practice.length) {
      setPhase('done')
      markComplete()
    } else {
      setCurrent((c) => c + 1)
      setSelected(null)
      setAnswered(false)
    }
  }

  // ---- LEARN: explicación + ejemplos ----
  if (phase === 'learn') {
    return (
      <div className="max-w-3xl mx-auto">
        <button onClick={onBack} className="text-blue-200 hover:text-white mb-3">← Volver a temas</button>
        <div className="bg-white rounded-3xl p-5 shadow-2xl">
          <div className="text-xs font-bold text-purple-500 uppercase mb-1">Teoría · Gramática</div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-3">{topic.title}</h2>
          <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-line leading-relaxed mb-5">
            {topic.explanation}
          </div>

          {examples.length > 0 && (
            <>
              <h3 className="text-lg font-bold text-gray-800 mb-2">📚 Ejemplos</h3>
              <div className="grid sm:grid-cols-2 gap-2 mb-5">
                {examples.map((ex) => (
                  <div key={ex.id} className="bg-blue-50 rounded-xl px-3 py-2 flex items-start gap-2">
                    <div className="flex-1">
                      <p className="font-medium text-gray-800 text-sm">{ex.text}</p>
                      {ex.note && <p className="text-xs text-gray-500 mt-0.5">{ex.note}</p>}
                    </div>
                    <SpeakButton text={ex.text} />
                  </div>
                ))}
              </div>
            </>
          )}

          <button
            onClick={() => setPhase(practice.length > 0 ? 'practice' : 'done')}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-bold hover:opacity-90 transition"
          >
            {practice.length > 0 ? '¡Ahora a practicar! 🎯' : 'Terminar tema ✅'}
          </button>
        </div>
      </div>
    )
  }

  // ---- PRACTICE: validar comprensión ----
  if (phase === 'practice' && q) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-3xl p-6 shadow-2xl">
          <div className="flex justify-between text-sm text-gray-500 mb-3">
            <span>Comprueba lo aprendido</span>
            <span>{current + 1} / {practice.length}</span>
          </div>
          <p className="text-xl font-semibold text-gray-800 mb-5">{q.question}</p>
          <div className="space-y-3">
            {q.options.map((opt) => {
              let style = 'border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50'
              if (answered && opt === q.correct_answer) style = 'border-2 border-green-500 bg-green-50'
              else if (answered && opt === selected) style = 'border-2 border-red-400 bg-red-50'
              return (
                <button key={opt} onClick={() => answer(opt)} disabled={answered}
                  className={`w-full text-left px-4 py-3 rounded-xl font-medium transition ${style}`}>
                  {opt}
                </button>
              )
            })}
          </div>
          {answered && (
            <div className={`mt-4 p-4 rounded-xl ${selected === q.correct_answer ? 'bg-green-50' : 'bg-amber-50'}`}>
              <p className="font-semibold mb-1">
                {selected === q.correct_answer ? '✅ ¡Muy bien!' : '💪 ¡Casi! No te rindas.'}
              </p>
              <p className="text-sm text-gray-600">{q.explanation}</p>
              <button onClick={next}
                className="mt-3 w-full bg-blue-600 text-white py-2 rounded-xl font-bold hover:bg-blue-700">
                {current + 1 >= practice.length ? 'Ver resultado 🏆' : 'Siguiente →'}
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ---- DONE ----
  return (
    <Celebration
      show
      emoji="🎉"
      title="¡Tema completado!"
      subtitle={topic.title}
      stats={practice.length > 0 ? [{ label: 'Correctas', value: `${score}/${practice.length}` }] : undefined}
      badges={newBadges.map((b) => ({ name: b.name, icon: b.icon }))}
      buttonLabel="Volver a temas"
      onClose={onBack}
    />
  )
}
