'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Student, AreaPerformance } from '@/lib/types'
import StudentTable from '@/components/StudentTable'
import AreaChart from '@/components/AreaChart'
import DashboardHeader from '@/components/DashboardHeader'

export default function DashboardPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [areaPerformance, setAreaPerformance] = useState<AreaPerformance[]>([])
  const [allPerformance, setAllPerformance] = useState<AreaPerformance[]>([])
  const [loading, setLoading] = useState(true)
  const [password, setPassword] = useState('')
  const [authenticated, setAuthenticated] = useState(false)

  const TEACHER_PASSWORD = 'best2024'

  useEffect(() => {
    const auth = sessionStorage.getItem('best_teacher')
    if (auth === 'true') setAuthenticated(true)
  }, [])

  useEffect(() => {
    if (authenticated) {
      loadStudents()
      subscribeToUpdates()
    }
  }, [authenticated])

  const subscribeToUpdates = () => {
    const channel = supabase
      .channel('student-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => {
        loadStudents()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_progress' }, () => {
        loadStudents()
        if (selectedStudent) loadStudentPerformance(selectedStudent.id)
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }

  const loadStudents = async () => {
    const { data } = await supabase
      .from('students')
      .select('*')
      .order('total_xp', { ascending: false })
    if (data) setStudents(data)

    const { data: perfData } = await supabase
      .from('student_area_performance')
      .select('*')
    if (perfData) setAllPerformance(perfData)

    setLoading(false)
  }

  const loadStudentPerformance = async (studentId: string) => {
    const { data } = await supabase
      .from('student_area_performance')
      .select('*')
      .eq('student_id', studentId)
    if (data) setAreaPerformance(data)
  }

  const handleSelectStudent = (student: Student) => {
    setSelectedStudent(student)
    loadStudentPerformance(student.id)
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === TEACHER_PASSWORD) {
      setAuthenticated(true)
      sessionStorage.setItem('best_teacher', 'true')
    } else {
      alert('Wrong password')
    }
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">👨‍🏫</div>
            <h1 className="text-2xl font-bold text-gray-800">Teacher Dashboard</h1>
            <p className="text-gray-500 text-sm">BEST Academy</p>
          </div>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter teacher password"
              className="w-full border rounded-xl px-4 py-3 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition"
            >
              Enter Dashboard
            </button>
          </form>
        </div>
      </div>
    )
  }

  const areas = ['vocabulary', 'grammar', 'listening', 'speaking', 'writing']

  const getClassAverage = (area: string) => {
    const areaData = allPerformance.filter(p => p.area === area)
    if (areaData.length === 0) return 0
    return Math.round(areaData.reduce((sum, p) => sum + (p.accuracy || 0), 0) / areaData.length)
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <DashboardHeader studentCount={students.length} />

      <main className="container mx-auto px-4 py-8">
        {/* Class Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {areas.map(area => (
            <div key={area} className="bg-white rounded-2xl p-4 shadow text-center">
              <div className="text-3xl mb-1">
                {area === 'vocabulary' ? '📖' : area === 'grammar' ? '✏️' : area === 'listening' ? '👂' : area === 'speaking' ? '🗣️' : '✍️'}
              </div>
              <div className="text-sm text-gray-500 capitalize">{area}</div>
              <div className="text-2xl font-bold text-blue-600">{getClassAverage(area)}%</div>
              <div className="text-xs text-gray-400">class avg</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Students Table */}
          <div className="lg:col-span-1">
            <StudentTable
              students={students}
              selectedStudent={selectedStudent}
              onSelectStudent={handleSelectStudent}
              loading={loading}
            />
          </div>

          {/* Student Detail Panel */}
          <div className="lg:col-span-2">
            {selectedStudent ? (
              <div className="space-y-6">
                {/* Student Info */}
                <div className="bg-white rounded-2xl p-6 shadow">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                      {selectedStudent.name.charAt(0)}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-800">{selectedStudent.name}</h2>
                      <p className="text-gray-500">{selectedStudent.email}</p>
                    </div>
                    <div className="ml-auto text-right">
                      <div className="text-2xl font-bold text-yellow-600">{selectedStudent.total_xp} XP</div>
                      <div className="text-sm text-orange-500">🔥 {selectedStudent.current_streak} day streak</div>
                    </div>
                  </div>
                </div>

                {/* Area Performance Chart */}
                <div className="bg-white rounded-2xl p-6 shadow">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Performance by Area</h3>
                  <AreaChart performance={areaPerformance} studentName={selectedStudent.name} />
                </div>

                {/* Strengths & Weaknesses */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
                    <h3 className="font-bold text-green-700 mb-3">💪 Strengths</h3>
                    {areaPerformance
                      .filter(p => (p.accuracy || 0) >= 70)
                      .sort((a, b) => (b.accuracy || 0) - (a.accuracy || 0))
                      .map(p => (
                        <div key={p.area} className="flex justify-between items-center mb-2">
                          <span className="capitalize text-green-800">{p.area}</span>
                          <span className="font-bold text-green-600">{Math.round(p.accuracy || 0)}%</span>
                        </div>
                      ))}
                    {areaPerformance.filter(p => (p.accuracy || 0) >= 70).length === 0 && (
                      <p className="text-green-600 text-sm">Keep practicing to build strengths!</p>
                    )}
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                    <h3 className="font-bold text-red-700 mb-3">🎯 Needs Work</h3>
                    {areaPerformance
                      .filter(p => (p.accuracy || 0) < 70)
                      .sort((a, b) => (a.accuracy || 0) - (b.accuracy || 0))
                      .map(p => (
                        <div key={p.area} className="flex justify-between items-center mb-2">
                          <span className="capitalize text-red-800">{p.area}</span>
                          <span className="font-bold text-red-600">{Math.round(p.accuracy || 0)}%</span>
                        </div>
                      ))}
                    {areaPerformance.filter(p => (p.accuracy || 0) < 70).length === 0 && (
                      <p className="text-red-600 text-sm">No weak areas yet!</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-12 shadow text-center">
                <div className="text-6xl mb-4">👈</div>
                <h3 className="text-xl font-bold text-gray-600">Select a student</h3>
                <p className="text-gray-400">Click on a student to see their detailed performance</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}