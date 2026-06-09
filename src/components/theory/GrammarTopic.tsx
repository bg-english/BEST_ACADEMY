'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Topic, TopicExample, TopicPractice } from '@/lib/types'
import Celebration from '@/components/Celebration'
import { recordProgress } from '@/lib/gamification'
import { playCorrect, playWrong } from '@/lib/sound'
import SpeakButton from '@/components/SpeakButton'
import TheoryMedia from '@/components/theory/TheoryMedia'
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
    const hasMedia = !!(topic.video_url || topic.image_url || (topic.slides && topic.slides.length))
    return (
      <div>
        <button onClick={onBack} className="text-on-surface-variant hover:text-secondary mb-4 flex items-center gap-1 font-button-text text-sm">
          <span className="material-symbols-outlined text-base">arrow_back</span> Volver a temas
        </button>
        <div className="mb-6">
          <nav className="flex items-center gap-2 text-primary font-stat-label text-stat-label mb-2 uppercase tracking-widest">
            <span>Teoría</span><span className="material-symbols-outlined text-sm">chevron_right</span><span>Gramática</span>
          </nav>
          <h2 className="font-headline-md text-2xl md:text-display-lg-mobile text-on-surface">Gramática: <span className="text-secondary">{topic.title}</span></h2>
        </div>

        <div className={`grid gap-8 items-start ${hasMedia ? 'lg:grid-cols-12' : 'lg:grid-cols-2'}`}>
          {hasMedia && <div className="lg:col-span-7"><TheoryMedia topic={topic} /></div>}

          <div className={`flex flex-col gap-6 ${hasMedia ? 'lg:col-span-5' : ''}`}>
            {/* La regla */}
            <section className="glass-card rounded-[2rem] p-7">
              <div className="flex items-center gap-3 mb-4">
                <span className="material-symbols-outlined text-secondary">info</span>
                <h3 className="font-headline-md text-2xl text-on-surface">La regla</h3>
              </div>
              <div className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed whitespace-pre-line">{topic.explanation}</div>
            </section>

            {/* Ejemplos */}
            {examples.length > 0 && (
              <section className="glass-card rounded-[2rem] p-7">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-headline-md text-2xl text-on-surface">Ejemplos</h3>
                  <span className="font-stat-label text-stat-label text-on-surface-variant uppercase">Toca para escuchar</span>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {examples.map((ex) => (
                    <div key={ex.id} className="group flex items-center justify-between gap-3 p-4 rounded-2xl bg-surface-container-high/40 border border-white/5 hover:border-secondary/50 transition-all">
                      <div className="flex-1">
                        <p className="font-headline-md text-lg text-white">{ex.text}</p>
                        {ex.note && <p className="text-xs text-on-surface-variant mt-0.5">{ex.note}</p>}
                      </div>
                      <SpeakButton text={ex.text} className="!text-secondary text-xl" />
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>

        <div className="flex justify-center mt-8">
          <button onClick={() => setPhase(practice.length > 0 ? 'practice' : 'done')}
            className="bg-gradient-to-r from-primary to-secondary text-on-primary font-button-text py-4 px-10 rounded-2xl glow-cyan hover:scale-[1.03] active:scale-95 transition-all">
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
        <div className="glass-card rounded-3xl p-6">
          <div className="flex justify-between font-stat-label text-stat-label text-on-surface-variant mb-4 uppercase tracking-widest">
            <span>Comprueba lo aprendido</span>
            <span className="text-secondary">{current + 1} / {practice.length}</span>
          </div>
          <p className="font-headline-md text-xl text-on-surface mb-5">{q.question}</p>
          <div className="space-y-3">
            {q.options.map((opt) => {
              let style = 'border border-white/10 bg-surface-container-high/40 hover:border-secondary/50 hover:bg-secondary/5'
              if (answered && opt === q.correct_answer) style = 'border border-tertiary bg-tertiary/10 text-tertiary'
              else if (answered && opt === selected) style = 'border border-error bg-error/10 text-error'
              return (
                <button key={opt} onClick={() => answer(opt)} disabled={answered}
                  className={`w-full text-left px-4 py-3 rounded-xl font-button-text transition ${style}`}>
                  {opt}
                </button>
              )
            })}
          </div>
          {answered && (
            <div className={`mt-4 p-4 rounded-xl border ${selected === q.correct_answer ? 'bg-tertiary/10 border-tertiary/30' : 'bg-error-container/10 border-error/30'}`}>
              <p className="font-button-text mb-1">
                {selected === q.correct_answer ? '✅ ¡Muy bien!' : '💪 ¡Casi! No te rindas.'}
              </p>
              <p className="text-sm text-on-surface-variant">{q.explanation}</p>
              <button onClick={next}
                className="mt-3 w-full bg-gradient-to-r from-primary to-secondary text-on-primary py-2.5 rounded-xl font-button-text hover:scale-[1.01] active:scale-95 transition-all">
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
