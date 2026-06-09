'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Unit, Student, Badge } from '@/lib/types'
import UnitCard from '@/components/UnitCard'
import StudentShell from '@/components/shell/StudentShell'
import LoginForm from '@/components/LoginForm'
import Leaderboard from '@/components/Leaderboard'
import ExamView, { ExamMode } from '@/components/exam/ExamView'
import { useLang } from '@/lib/LangContext'

export default function HomePage() {
  const { t } = useLang()
  const [student, setStudent] = useState<Student | null>(null)
  const [units, setUnits] = useState<Unit[]>([])
  const [unitPct, setUnitPct] = useState<Record<number, number>>({})
  const [badges, setBadges] = useState<Badge[]>([])
  const [loading, setLoading] = useState(true)
  const [examMode, setExamMode] = useState<ExamMode | null>(null)

  useEffect(() => {
    loadUnits()
    checkSession()
  }, [])

  const checkSession = async () => {
    // Guarda defensiva: si getSession se cuelga (lock interno en algunos navegadores),
    // no dejamos la app en "Loading" para siempre.
    const session = await Promise.race([
      supabase.auth.getSession().then((r) => r.data.session),
      new Promise<null>((res) => setTimeout(() => res(null), 4000)),
    ])
    if (session?.user) {
      const { data: s } = await supabase
        .from('students')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle()
      if (s) {
        setStudent(s as Student)
        loadStudentData(s.id)
      }
    }
    setLoading(false)
  }

  const loadUnits = async () => {
    const { data } = await supabase.from('units').select('*').order('number')
    if (data) setUnits(data)
  }

  const loadStudentData = async (studentId: string) => {
    // Progreso por unidad desde el modelo nuevo (nivel de práctica alcanzado, sobre 6 niveles)
    const { data: stats } = await supabase
      .from('student_practice_stats')
      .select('unit_id, level_reached')
      .eq('student_id', studentId)
    const map: Record<number, number> = {}
    if (stats) {
      stats.forEach((s: { unit_id: number; level_reached: number }) => {
        map[s.unit_id] = Math.min(100, Math.round((s.level_reached / 6) * 100))
      })
    }
    setUnitPct(map)

    const { data: badgeData } = await supabase
      .from('student_badges')
      .select('*, badge:badges(*)')
      .eq('student_id', studentId)
    if (badgeData) setBadges(badgeData.map((b: any) => b.badge))
  }

  const handleLogin = (s: Student) => {
    setStudent(s)
    loadStudentData(s.id)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setStudent(null)
    setUnitPct({})
    setBadges([])
  }

  const getUnitProgress = (unitId: number) => unitPct[unitId] || 0

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="font-headline-md text-2xl text-on-surface-variant animate-pulse">Cargando BEST Academy…</div>
      </div>
    )
  }

  if (!student) {
    return <LoginForm onLogin={handleLogin} />
  }

  const evals: { m: ExamMode; icon: string; color: string; label: string }[] = [
    { m: 'placement', icon: 'rocket_launch', color: 'text-primary', label: t('Examen de inicio', 'Placement test') },
    { m: 'quiz', icon: 'bolt', color: 'text-secondary', label: t('Quiz corto', 'Quick quiz') },
    { m: 'final', icon: 'school', color: 'text-tertiary', label: t('Examen final', 'Final exam') },
  ]

  return (
    <StudentShell student={student} onLogout={handleLogout} active="home">
      <div className="grid grid-cols-12 gap-8 items-start">
        {/* Centro */}
        <div className="col-span-12 lg:col-span-9 space-y-10">
          {/* Unidades */}
          <section id="units">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-headline-md text-headline-md flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">rocket_launch</span>
                {t('Tus unidades', 'Current Units')}
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              {units.map((unit) => (
                <UnitCard key={unit.id} unit={unit} progress={getUnitProgress(unit.id)} isUnlocked studentId={student.id} onComplete={() => loadStudentData(student.id)} />
              ))}
            </div>
          </section>

          {/* Insignias + Evaluaciones */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <section>
              <h2 className="font-headline-md text-xl mb-6 flex items-center gap-3">
                <span className="material-symbols-outlined text-secondary">workspace_premium</span>
                {t('Tus insignias', 'Your badges')}
              </h2>
              <div className="flex flex-wrap gap-3">
                {badges.length === 0 && <p className="text-on-surface-variant text-sm">{t('Aún sin insignias. ¡A ganarlas!', 'No badges yet. Go earn them!')}</p>}
                {badges.map((b) => (
                  <div key={b.id} className="flex items-center gap-3 bg-primary/10 border border-primary/20 px-4 py-2 rounded-2xl">
                    <span className="text-xl">{b.icon}</span>
                    <span className="font-button-text text-sm">{b.name}</span>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="font-headline-md text-xl mb-6 flex items-center gap-3">
                <span className="material-symbols-outlined text-tertiary">quiz</span>
                {t('Evaluaciones', 'Assessments')}
              </h2>
              <div className="space-y-3">
                {evals.map((e) => (
                  <button key={e.m} onClick={() => setExamMode(e.m)}
                    className="glass-card glass-card-hover w-full flex items-center justify-between p-4 rounded-2xl group transition-all">
                    <div className="flex items-center gap-4">
                      <span className={`material-symbols-outlined ${e.color}`}>{e.icon}</span>
                      <span className="font-button-text">{e.label}</span>
                    </div>
                    <span className="material-symbols-outlined text-on-surface-variant group-hover:translate-x-1 transition-transform">chevron_right</span>
                  </button>
                ))}
              </div>
            </section>
          </div>
        </div>

        {/* Columna derecha */}
        <div className="col-span-12 lg:col-span-3 space-y-6" id="leaderboard">
          <Leaderboard studentName={student.name} />
          <div className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-primary-container to-surface-container shadow-2xl">
            <h4 className="font-headline-md text-lg mb-2">{t('¿Sabías que…?', 'Did you know?')}</h4>
            <p className="font-body-md text-sm text-on-primary-container/80">
              {t('Practicar un poco cada día sube tu racha y tu XP más rápido.', 'A little practice every day boosts your streak and XP faster.')}
            </p>
          </div>
        </div>
      </div>

      {examMode && (
        <ExamView mode={examMode} studentId={student.id} onClose={() => { setExamMode(null); loadStudentData(student.id) }} />
      )}
    </StudentShell>
  )
}