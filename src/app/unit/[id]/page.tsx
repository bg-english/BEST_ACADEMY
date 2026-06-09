'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Unit, Student } from '@/lib/types'
import TheoryView from '@/components/theory/TheoryView'
import PracticeView from '@/components/practice/PracticeView'
import StudentShell from '@/components/shell/StudentShell'
import { useLang } from '@/lib/LangContext'

type Tab = 'theory' | 'practice'

export default function UnitPage() {
  const params = useParams()
  const router = useRouter()
  const { t } = useLang()
  const unitId = Number(params.id)

  const [student, setStudent] = useState<Student | null>(null)
  const [unit, setUnit] = useState<Unit | null>(null)
  const [tab, setTab] = useState<Tab>('theory')
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
      <div className="min-h-screen flex items-center justify-center font-headline-md text-xl text-on-surface-variant animate-pulse">
        Cargando unidad…
      </div>
    )
  }

  if (!unit || !student) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-on-surface gap-4">
        <p>No encontramos esta unidad.</p>
        <button onClick={() => router.push('/')} className="text-secondary underline">Volver al inicio</button>
      </div>
    )
  }

  const handleLogout = async () => { await supabase.auth.signOut(); router.replace('/') }

  return (
    <StudentShell student={student} onLogout={handleLogout} active="units">
      {/* Header */}
      <header className="flex flex-col gap-6 mb-10">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/')}
            className="w-12 h-12 rounded-xl flex items-center justify-center bg-surface-container-high border border-white/10 text-on-surface hover:bg-white/10 transition-colors active:scale-90">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <h1 className="font-headline-md text-2xl sm:text-headline-md text-on-surface tracking-tight">Unidad {unit.number}: {unit.title}</h1>
            {unit.description && <p className="text-on-surface-variant opacity-80">{unit.description}</p>}
          </div>
        </div>

        {/* Tabs deslizantes */}
        <div className="relative w-full max-w-md p-1.5 bg-surface-container-lowest border border-white/5 rounded-2xl flex">
          <div className="absolute inset-y-1.5 w-[calc(50%-6px)] bg-primary-container/20 border border-primary/20 rounded-xl transition-all duration-300"
            style={{ left: tab === 'theory' ? '6px' : 'calc(50%)' }} />
          <button onClick={() => setTab('theory')}
            className={`relative z-10 flex-1 py-3 flex items-center justify-center gap-2 font-button-text text-button-text transition-colors ${tab === 'theory' ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}>
            <span>📘</span><span>{t('Teoría', 'Theory')}</span>
          </button>
          <button onClick={() => setTab('practice')}
            className={`relative z-10 flex-1 py-3 flex items-center justify-center gap-2 font-button-text text-button-text transition-colors ${tab === 'practice' ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}>
            <span>🏋️</span><span>{t('Práctica', 'Practice')}</span>
          </button>
        </div>
      </header>

      <div className="pb-8">
        {tab === 'theory' ? (
          <TheoryView unitId={unit.id} studentId={student.id} />
        ) : (
          <PracticeView unitId={unit.id} studentId={student.id} />
        )}
      </div>
    </StudentShell>
  )
}
