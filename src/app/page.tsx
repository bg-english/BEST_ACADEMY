'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Unit, Student, Badge } from '@/lib/types'
import UnitCard from '@/components/UnitCard'
import StudentHeader from '@/components/StudentHeader'
import BadgeDisplay from '@/components/BadgeDisplay'
import LoginForm from '@/components/LoginForm'
import Leaderboard from '@/components/Leaderboard'

export default function HomePage() {
  const [student, setStudent] = useState<Student | null>(null)
  const [units, setUnits] = useState<Unit[]>([])
  const [unitPct, setUnitPct] = useState<Record<number, number>>({})
  const [badges, setBadges] = useState<Badge[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUnits()
    checkSession()
  }, [])

  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession()
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
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-2xl animate-pulse">Loading BEST Academy...</div>
      </div>
    )
  }

  if (!student) {
    return <LoginForm onLogin={handleLogin} />
  }

  const level = Math.floor(student.total_xp / 100) + 1
  const xpInLevel = student.total_xp % 100
  const nextLevelXp = 100

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      <StudentHeader student={student} level={level} xpInLevel={xpInLevel} nextLevelXp={nextLevelXp} onLogout={handleLogout} />

      <main className="container mx-auto px-4 py-8">
        {/* Welcome banner */}
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
            Welcome back, {student.name.split(' ')[0]}! 👋
          </h1>
          <p className="text-blue-200 text-base sm:text-lg">Keep learning, keep growing!</p>
          {student.current_streak > 0 && (
            <div className="inline-flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-full mt-3 font-semibold">
              🔥 {student.current_streak} day streak!
            </div>
          )}
        </div>

        {/* XP Progress Bar */}
        <div className="max-w-md mx-auto mb-10 bg-white/10 rounded-2xl p-4">
          <div className="flex justify-between text-white text-sm mb-2">
            <span>Level {level}</span>
            <span>{xpInLevel}/{nextLevelXp} XP</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-4">
            <div
              className="xp-bar bg-gradient-to-r from-yellow-400 to-orange-500 h-4 rounded-full"
              style={{ width: `${(xpInLevel / nextLevelXp) * 100}%` }}
            />
          </div>
        </div>

        {/* Units Grid */}
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">📚 Your Learning Journey</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {units.map((unit, index) => (
              <UnitCard
                key={unit.id}
                unit={unit}
                progress={getUnitProgress(unit.id)}
                isUnlocked={true}
                studentId={student.id}
                onComplete={() => loadStudentData(student.id)}
              />
            ))}
          </div>
        </div>

        {/* Badges */}
        {badges.length > 0 && (
          <div className="mb-10">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">🏅 Tus insignias</h2>
            <BadgeDisplay badges={badges} />
          </div>
        )}

        {/* Ranking de la clase */}
        <div className="mb-10">
          <Leaderboard studentName={student.name} />
        </div>
      </main>
    </div>
  )
}