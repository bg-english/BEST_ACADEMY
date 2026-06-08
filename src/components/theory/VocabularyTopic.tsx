'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Topic, VocabWord, GradeResult } from '@/lib/types'
import Celebration from '@/components/Celebration'

interface Props {
  topic: Topic
  studentId: string
  onComplete: () => void
  onBack: () => void
}

async function grade(body: object): Promise<GradeResult | { error: string }> {
  const res = await fetch('/api/grade', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.json()
}

export default function VocabularyTopic({ topic, studentId, onComplete, onBack }: Props) {
  const [words, setWords] = useState<VocabWord[]>([])
  const [idx, setIdx] = useState(0)
  const [stage, setStage] = useState<'definition' | 'sentences' | 'wordDone'>('definition')

  // definición
  const [definition, setDefinition] = useState('')
  const [defBusy, setDefBusy] = useState(false)
  const [defFeedback, setDefFeedback] = useState<GradeResult | null>(null)
  const [examples, setExamples] = useState<string[]>([])

  // oraciones
  const [sentences, setSentences] = useState<string[]>(['', '', '', '', ''])
  const [sentResults, setSentResults] = useState<(GradeResult | null)[]>([null, null, null, null, null])
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
    if ('error' in r) { setDefFeedback({ correct: false, feedback: r.error, suggestion: '' }); return }
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
    const results = await Promise.all(
      sentences.map((s) =>
        s.trim()
          ? grade({ task: 'sentence', word: word.word, partOfSpeech: word.part_of_speech, studentText: s.trim() })
          : Promise.resolve({ correct: false, feedback: 'Escribe una oración aquí.', suggestion: '' } as GradeResult)
      )
    )
    const norm = results.map((r) => ('error' in r ? { correct: false, feedback: r.error, suggestion: '' } : r))
    setSentResults(norm)
    setSentBusy(false)
    const allOk = norm.every((r) => r.correct)
    if (allOk) {
      await supabase.from('student_vocab').upsert(
        { student_id: studentId, word_id: word.id, sentences, sentences_ok: true, updated_at: new Date().toISOString() },
        { onConflict: 'student_id,word_id' }
      )
      setStage('wordDone')
    }
  }

  const nextWord = async () => {
    if (idx + 1 >= words.length) {
      await supabase.from('student_topic_progress').upsert(
        { student_id: studentId, topic_id: topic.id, completed: true, completed_at: new Date().toISOString() },
        { onConflict: 'student_id,topic_id' }
      )
      onComplete()
    } else {
      setIdx((i) => i + 1)
      resetForWord()
    }
  }

  if (!word) {
    return (
      <div className="max-w-2xl mx-auto">
        <button onClick={onBack} className="text-blue-200 hover:text-white mb-4">← Volver a temas</button>
        <div className="bg-white rounded-3xl p-8 text-center text-gray-500">Cargando vocabulario…</div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <button onClick={onBack} className="text-blue-200 hover:text-white mb-3">← Volver a temas</button>
      <div className="bg-white rounded-3xl p-5 shadow-2xl">
        <div className="flex justify-between items-center mb-3">
          <div className="text-xs font-bold text-purple-500 uppercase">Vocabulario · Palabra {idx + 1} de {words.length}</div>
        </div>

        {/* Tarjeta de la palabra */}
        <div className="text-center bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-2xl py-3 px-4 mb-4 flex items-baseline justify-center gap-3 flex-wrap">
          <span className="text-2xl sm:text-3xl font-bold">{word.word}</span>
          {word.phonetic && <span className="text-blue-100 text-sm">{word.phonetic}</span>}
          {word.part_of_speech && <span className="text-xs uppercase tracking-wide text-blue-200">{word.part_of_speech}</span>}
        </div>

        {/* ETAPA 1: el alumno escribe el significado */}
        {stage === 'definition' && (
          <>
            <label className="block font-semibold text-gray-800 mb-2">✍️ Escribe con tus palabras qué significa:</label>
            <textarea
              value={definition} onChange={(e) => setDefinition(e.target.value)} rows={2}
              placeholder="El significado de la palabra…"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 focus:outline-none focus:border-blue-500"
            />
            {defFeedback && (
              <div className={`mt-3 p-4 rounded-xl ${defFeedback.correct ? 'bg-green-50' : 'bg-amber-50'}`}>
                <p className="font-semibold mb-1">{defFeedback.correct ? '🎉 ¡Correcto!' : '💪 ¡Inténtalo otra vez!'}</p>
                <p className="text-sm text-gray-700">{defFeedback.feedback}</p>
              </div>
            )}
            {!defFeedback?.correct ? (
              <button onClick={submitDefinition} disabled={defBusy}
                className="mt-4 w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50">
                {defBusy ? 'Revisando…' : 'Revisar significado'}
              </button>
            ) : (
              <>
                {examples.length > 0 && (
                  <div className="mt-4">
                    <h3 className="font-bold text-gray-800 mb-2">📖 Mira cómo se usa:</h3>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {examples.map((ex, i) => (
                        <div key={i} className="bg-blue-50 rounded-xl px-3 py-2 text-sm text-gray-800">{ex}</div>
                      ))}
                    </div>
                  </div>
                )}
                <button onClick={() => setStage('sentences')}
                  className="mt-4 w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-bold hover:opacity-90">
                  Ahora me toca a mí ✍️
                </button>
              </>
            )}
          </>
        )}

        {/* ETAPA 2: el alumno construye 5 oraciones */}
        {stage === 'sentences' && (
          <>
            <label className="block font-semibold text-gray-800 mb-2">
              Escribe <span className="text-purple-600">5 oraciones</span> usando &quot;{word.word}&quot;:
            </label>
            <div className="space-y-2">
              {sentences.map((s, i) => {
                const r = sentResults[i]
                const border = r ? (r.correct ? 'border-green-500' : 'border-red-400') : 'border-gray-200'
                return (
                  <div key={i}>
                    <input
                      value={s}
                      onChange={(e) => { const c = [...sentences]; c[i] = e.target.value; setSentences(c) }}
                      placeholder={`Oración ${i + 1}`}
                      className={`w-full border-2 ${border} rounded-xl px-4 py-2 focus:outline-none focus:border-blue-500`}
                    />
                    {r && !r.correct && (
                      <p className="text-xs text-amber-600 mt-1 ml-1">{r.feedback}{r.suggestion ? ` Ej.: ${r.suggestion}` : ''}</p>
                    )}
                  </div>
                )
              })}
            </div>
            <button onClick={submitSentences} disabled={sentBusy}
              className="mt-4 w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50">
              {sentBusy ? 'Revisando tus oraciones…' : 'Revisar mis oraciones'}
            </button>
          </>
        )}

        {stage === 'wordDone' && (
          <p className="text-center text-gray-400 py-4">¡Palabra dominada! 🌟</p>
        )}
      </div>

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
