'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Topic, VocabWord, GradeResult } from '@/lib/types'
import Celebration from '@/components/Celebration'
import SpeakButton from '@/components/SpeakButton'
import TheoryMedia from '@/components/theory/TheoryMedia'
import { recordProgress } from '@/lib/gamification'
import { speak } from '@/lib/tts'

interface Props {
  topic: Topic
  studentId: string
  onComplete: () => void
  onBack: () => void
}

type Result = GradeResult & { infra?: boolean }

async function grade(body: object): Promise<Result> {
  try {
    const res = await fetch('/api/grade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const json = await res.json()
    if (!res.ok || json?.error) {
      // Fallo de infraestructura (API caída, sin saldo, sin key): no atrapar al alumno
      return { correct: false, infra: true, feedback: 'No pudimos verificar ahora mismo, pero puedes continuar. 🙂', suggestion: '' }
    }
    return json as Result
  } catch {
    return { correct: false, infra: true, feedback: 'Sin conexión con el calificador. Puedes continuar.', suggestion: '' }
  }
}

export default function VocabularyTopic({ topic, studentId, onComplete, onBack }: Props) {
  const [words, setWords] = useState<VocabWord[]>([])
  const [idx, setIdx] = useState(0)
  const [stage, setStage] = useState<'definition' | 'sentences' | 'wordDone'>('definition')

  // definición
  const [definition, setDefinition] = useState('')
  const [defBusy, setDefBusy] = useState(false)
  const [defFeedback, setDefFeedback] = useState<Result | null>(null)
  const [examples, setExamples] = useState<string[]>([])

  // oraciones
  const [sentences, setSentences] = useState<string[]>(['', '', '', '', ''])
  const [sentResults, setSentResults] = useState<(Result | null)[]>([null, null, null, null, null])
  const [sentBusy, setSentBusy] = useState(false)

  useEffect(() => {
    supabase.from('vocabulary_words')
      .select('id, topic_id, order_index, word, part_of_speech, phonetic')
      .eq('topic_id', topic.id).order('order_index')
      .then(({ data }) => { if (data) setWords(data as VocabWord[]) })
  }, [topic.id])

  const word = words[idx]

  const resetForWord = () => {
    setStage('definition'); setDefinition(''); setDefFeedback(null); setExamples([])
    setSentences(['', '', '', '', '']); setSentResults([null, null, null, null, null])
  }

  const submitDefinition = async () => {
    if (!definition.trim()) return
    setDefBusy(true)
    const r = await grade({ task: 'definition', word: word.word, partOfSpeech: word.part_of_speech, wordId: word.id, studentText: definition.trim() })
    setDefBusy(false)
    setDefFeedback(r)
    if (r.correct) {
      setExamples(r.examples || [])
      await supabase.from('student_vocab').upsert(
        { student_id: studentId, word_id: word.id, definition: definition.trim(), definition_ok: true, updated_at: new Date().toISOString() },
        { onConflict: 'student_id,word_id' }
      )
    }
  }

  const submitSentences = async () => {
    setSentBusy(true)
    const results: Result[] = await Promise.all(
      sentences.map((s) =>
        s.trim()
          ? grade({ task: 'sentence', word: word.word, partOfSpeech: word.part_of_speech, studentText: s.trim() })
          : Promise.resolve({ correct: false, feedback: 'Escribe una oración aquí.', suggestion: '' } as Result)
      )
    )
    setSentResults(results)
    setSentBusy(false)
    // Avanza si todas están correctas, o si el calificador no estaba disponible (no atrapar al alumno)
    const allOk = results.every((r) => r.correct || r.infra)
    if (allOk) {
      await supabase.from('student_vocab').upsert(
        { student_id: studentId, word_id: word.id, sentences, sentences_ok: results.every((r) => r.correct), updated_at: new Date().toISOString() },
        { onConflict: 'student_id,word_id' }
      )
      setStage('wordDone')
    }
  }

  const nextWord = async () => {
    if (idx + 1 >= words.length) {
      const { data: existing } = await supabase
        .from('student_topic_progress')
        .select('completed').eq('student_id', studentId).eq('topic_id', topic.id).maybeSingle()
      await supabase.from('student_topic_progress').upsert(
        { student_id: studentId, topic_id: topic.id, completed: true, completed_at: new Date().toISOString() },
        { onConflict: 'student_id,topic_id' }
      )
      if (!existing?.completed) await recordProgress(studentId, 40) // XP + racha + logros, solo la 1ª vez
      onComplete()
    } else {
      setIdx((i) => i + 1)
      resetForWord()
    }
  }

  if (!word) {
    return (
      <div>
        <button onClick={onBack} className="text-on-surface-variant hover:text-secondary mb-4 flex items-center gap-1 font-button-text text-sm">
          <span className="material-symbols-outlined text-base">arrow_back</span> Volver a temas
        </button>
        <div className="glass-card rounded-3xl p-8 text-center text-on-surface-variant animate-pulse">Cargando vocabulario…</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <button onClick={onBack} className="text-on-surface-variant hover:text-secondary mb-4 flex items-center gap-1 font-button-text text-sm">
        <span className="material-symbols-outlined text-base">arrow_back</span> Volver a temas
      </button>

      {/* Progreso de palabras */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <span className="font-stat-label text-stat-label text-on-surface-variant uppercase tracking-widest">Progreso</span>
        <div className="flex gap-2 flex-wrap">
          {words.map((_, i) => (
            <div key={i} className={`w-3 h-3 rounded-full transition-all ${i < idx ? 'bg-tertiary' : i === idx ? 'bg-secondary ring-4 ring-secondary/20 scale-125' : 'bg-surface-container-highest'}`} />
          ))}
        </div>
        <span className="font-stat-label text-stat-label text-primary">{idx + 1} / {words.length}</span>
      </div>

      {idx === 0 && <div className="mb-6"><TheoryMedia topic={topic} /></div>}

      {/* Hero de la palabra */}
      <section className="glass-card rounded-3xl p-6 md:p-8 mb-8 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <span className="font-stat-label text-stat-label text-secondary mb-2 block tracking-widest uppercase">Vocabulary Master</span>
          <h1 className="font-display-lg text-3xl md:text-5xl bg-gradient-to-r from-white to-primary bg-clip-text text-transparent">
            {word.word}
            {word.phonetic && <span className="text-on-surface-variant font-light text-xl md:text-2xl ml-3">{word.phonetic}</span>}
          </h1>
          {word.part_of_speech && <span className="text-xs uppercase tracking-wide text-on-surface-variant">{word.part_of_speech}</span>}
        </div>
        <button onClick={() => speak(word.word)}
          className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-on-primary shadow-lg shadow-primary/25 hover:scale-110 active:scale-95 transition-all shrink-0">
          <span className="material-symbols-outlined text-3xl filled-icon">volume_up</span>
        </button>
      </section>

      {/* ETAPA 1: escribe el significado */}
      {stage === 'definition' && (
        <section className="glass-card rounded-3xl p-6 md:p-8 mb-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center font-bold text-on-primary-container">1</div>
            <h3 className="font-headline-md text-2xl text-on-surface">Escribe el significado</h3>
          </div>
          <textarea value={definition} onChange={(e) => setDefinition(e.target.value)} rows={3}
            placeholder="¿Qué significa esta palabra para ti?"
            className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-5 font-body-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-primary transition-all placeholder:text-outline/50 min-h-[120px]" />

          {defFeedback && (
            <div className={`mt-4 p-4 rounded-2xl border ${defFeedback.correct ? 'bg-tertiary-container/20 border-tertiary/30' : defFeedback.infra ? 'bg-secondary/10 border-secondary/30' : 'bg-error-container/10 border-error/30'}`}>
              <p className="font-button-text mb-1 flex items-center gap-2">
                {defFeedback.correct ? <><span className="material-symbols-outlined text-tertiary">check_circle</span><span className="text-tertiary">¡Increíble! Capturaste la esencia.</span></> : defFeedback.infra ? 'ℹ️ Aviso' : '💪 ¡Inténtalo otra vez!'}
              </p>
              <p className="text-sm text-on-surface-variant">{defFeedback.feedback}</p>
            </div>
          )}

          {defFeedback?.infra ? (
            <button onClick={() => setStage('sentences')}
              className="mt-5 w-full bg-gradient-to-r from-primary to-secondary text-on-primary py-3.5 rounded-xl font-button-text hover:scale-[1.01] active:scale-95 transition-all">
              Continuar de todos modos →
            </button>
          ) : !defFeedback?.correct ? (
            <div className="flex justify-end mt-5">
              <button onClick={submitDefinition} disabled={defBusy}
                className="bg-gradient-to-r from-primary-container to-secondary-container px-12 py-3.5 rounded-xl font-button-text text-on-primary-fixed shadow-xl hover:-translate-y-0.5 active:scale-95 transition-all disabled:opacity-50">
                {defBusy ? 'Revisando…' : 'Revisar'}
              </button>
            </div>
          ) : (
            <>
              {examples.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-headline-md text-lg text-on-surface mb-3">Mira cómo se usa:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {examples.map((ex, i) => (
                      <div key={i} className="glass-card glass-card-hover p-5 rounded-2xl flex flex-col justify-between gap-3">
                        <p className="font-body-md text-on-surface text-sm">{ex}</p>
                        <div className="self-end"><SpeakButton text={ex} className="!text-secondary text-xl" /></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <button onClick={() => setStage('sentences')}
                className="mt-6 w-full bg-gradient-to-r from-primary to-secondary text-on-primary py-3.5 rounded-xl font-button-text hover:scale-[1.01] active:scale-95 transition-all">
                Ahora me toca a mí ✍️
              </button>
            </>
          )}
        </section>
      )}

      {/* ETAPA 2: construye 5 oraciones */}
      {stage === 'sentences' && (
        <section className="glass-card rounded-3xl p-6 md:p-8 mb-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center font-bold text-on-primary-container">2</div>
            <h3 className="font-headline-md text-2xl text-on-surface">Construye una oración</h3>
          </div>
          <p className="text-on-surface-variant mb-4">Escribe <span className="text-secondary font-bold">5 oraciones</span> usando &quot;{word.word}&quot;:</p>
          <div className="space-y-3">
            {sentences.map((s, i) => {
              const r = sentResults[i]
              const border = r ? (r.correct ? 'border-tertiary' : r.infra ? 'border-secondary' : 'border-error') : 'border-outline-variant/30'
              return (
                <div key={i}>
                  <input value={s} onChange={(e) => { const c = [...sentences]; c[i] = e.target.value; setSentences(c) }}
                    placeholder={`Oración ${i + 1}`}
                    className={`w-full bg-surface-container-lowest border ${border} rounded-xl px-4 py-3 text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/40 transition-all placeholder:text-outline/50`} />
                  {r && !r.correct && (
                    <p className="text-xs text-amber-300 mt-1 ml-1">{r.feedback}{r.suggestion ? ` Ej.: ${r.suggestion}` : ''}</p>
                  )}
                </div>
              )
            })}
          </div>
          <button onClick={submitSentences} disabled={sentBusy}
            className="mt-5 w-full bg-gradient-to-r from-primary to-secondary text-on-primary py-3.5 rounded-xl font-button-text hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50">
            {sentBusy ? 'Revisando tus oraciones…' : 'Revisar mis oraciones'}
          </button>
        </section>
      )}

      <Celebration
        show={stage === 'wordDone'}
        emoji="🌟"
        sound="word"
        title={`¡Dominaste "${word.word}"!`}
        subtitle="¡Excelente trabajo!"
        buttonLabel={idx + 1 >= words.length ? 'Terminar tema ✅' : 'Siguiente palabra →'}
        onClose={nextWord}
      />
    </div>
  )
}
