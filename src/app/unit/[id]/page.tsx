'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Unit, Student } from '@/lib/types'
import TheoryView from '@/components/theory/TheoryView'
import ActivityModal from '@/components/ActivityModal'

type Tab = 'theory' | 'practice'

export default function UnitPage() {
  const params = useParams()
  const router = useRouter()
  const unitId = Number(params.id)

  const [student, setStudent] = useState<Student | null>(null)
  const [unit, setUnit] = useState<Unit | null>(null)
  const [tab, setTab] = useState<Tab>('theory')
  const [showPractice, setShowPractice] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { router.replace('/'); return }
      const { data: s } = await supabase.from('students').select('*').eq('id', session.user.id).maybeSingle()
      if (s) setStudent(s as Student)
      const { data: u } = await supabase.from('units').select('*').eq('id', unitId).maybeSingle()
      if (u) setUnit(u as Unit)
      setLoading(false)
    }
    init()
  }, [unitId, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center text-white text-xl animate-pulse">
        Cargando unidad…
      </div>
    )
  }

  if (!unit || !student) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex flex-col items-center justify-center text-white gap-4">
        <p>No encontramos esta unidad.</p>
        <button onClick={() => router.push('/')} className="underline">Volver al inicio</button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      <header className="container mx-auto px-4 py-5 flex items-center justify-between">
        <button onClick={() => router.push('/')} className="text-blue-200 hover:text-white">← Inicio</button>
        <div className="text-center">
          <div className="text-xs text-blue-300 uppercase tracking-wide">Unit {unit.number}</div>
          <h1 className="text-xl font-bold text-white">{unit.title}</h1>
        </div>
        <div className="w-12" />
      </header>

      <div className="container mx-auto px-4">
        <div className="flex gap-2 justify-center mb-6">
          <button onClick={() => setTab('theory')}
            className={`px-5 py-2 rounded-full font-semibold ${tab === 'theory' ? 'bg-white text-purple-700' : 'bg-white/10 text-white'}`}>
            📘 Teoría
          </button>
          <button onClick={() => setTab('practice')}
            className={`px-5 py-2 rounded-full font-semibold ${tab === 'practice' ? 'bg-white text-purple-700' : 'bg-white/10 text-white'}`}>
            🏋️ Práctica
          </button>
        </div>

        <main className="pb-12">
          {tab === 'theory' ? (
            <TheoryView unitId={unit.id} studentId={student.id} />
          ) : (
            <div className="max-w-2xl mx-auto bg-white rounded-3xl p-8 text-center shadow-2xl">
              <div className="text-5xl mb-3">🏋️</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Práctica</h2>
              <p className="text-gray-500 mb-6">Pon a prueba lo que aprendiste con ejercicios de la unidad.</p>
              <button onClick={() => setShowPractice(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-bold hover:opacity-90">
                Empezar práctica 🎯
              </button>
            </div>
          )}
        </main>
      </div>

      {showPractice && (
        <ActivityModal unit={unit} studentId={student.id} onClose={() => setShowPractice(false)} />
      )}
    </div>
  )
}
