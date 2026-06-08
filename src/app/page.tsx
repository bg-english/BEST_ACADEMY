'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Unit, Student, StudentProgress, Badge } from '@/lib/types'
import UnitCard from '@/components/UnitCard'
import StudentHeader from '@/components/StudentHeader'
import BadgeDisplay from '@/components/BadgeDisplay'
import LoginForm from '@/components/LoginForm'

export default function HomePage() {
  const [student, setStudent] = useState<Student | null>(null)
  const [units, setUnits] = useState<Unit[]>([])
  const [progress, setProgress] = useState<StudentProgress[]>([])
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
    const { data: progressData } = await supabase
      .from('student_progress')
      .select('*')
      .eq('student_id', studentId)
    if (progressData) setProgress(progressData)

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
    setProgress([])
    setBadges([])
  }

  const getUnitProgress = (unitId: number) => {
    const unitProgress = progress.filter(p => p.unit_id === unitId)
    if (unitProgress.length === 0) return 0
    const avg = unitProgress.reduce((sum, p) => sum + (p.accuracy_percentage || 0), 0) / unitProgress.length
    return Math.round(avg)
  }

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
          <h1 className="text-4xl font-bold text-white mb-2">
            Welcome back, {student.name.split(' ')[0]}! 👋
          </h1>
          <p className="text-blue-200 text-lg">Keep learning, keep growing!</p>
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
                isUnlocked={index === 0 || getUnitProgress(units[index - 1]?.id) >= 60}
                studentId={student.id}
                onComplete={() => loadStudentData(student.id)}
              />
            ))}
          </div>
        </div>

        {/* Badges */}
        {badges.length > 0 && (
          <div className="mb-10">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">🏆 Your Badges</h2>
            <BadgeDisplay badges={badges} />
          </div>
        )}
      </main>
    </div>
  )
}