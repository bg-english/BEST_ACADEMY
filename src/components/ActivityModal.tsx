'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Activity, Unit } from '@/lib/types'

interface Props {
  unit: Unit
  studentId: string
  onClose: () => void
}

export default function ActivityModal({ unit, studentId, onClose }: Props) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [answered, setAnswered] = useState(false)
  const [score, setScore] = useState({ correct: 0, total: 0 })
  const [finished, setFinished] = useState(false)
  const [xpEarned, setXpEarned] = useState(0)

  useEffect(() => {
    loadActivities()
  }, [])

  const loadActivities = async () => {
    const { data } = await supabase
      .from('activities')
      .select('*')
      .eq('unit_id', unit.id)
      .order('difficulty')
    if (data) setActivities(data)
  }

  const handleAnswer = async (option: string) => {
    if (answered) return
    setSelected(option)
    setAnswered(true)

    const activity = activities[current]
    const isCorrect = option === activity.correct_answer

    if (isCorrect) {
      setScore(s => ({ correct: s.correct + 1, total: s.total + 1 }))
      setXpEarned(x => x + activity.xp_reward)
    } else {
      setScore(s => ({ ...s, total: s.total + 1 }))
    }

    // Save response
    await supabase.from('student_responses').insert({
      student_id: studentId,
      activity_id: activity.id,
      selected_answer: option,
      is_correct: isCorrect,
      xp_earned: isCorrect ? activity.xp_reward : 0,
    })

    // Update student_progress
    const { data: existing } = await supabase
      .from('student_progress')
      .select('*')
      .eq('student_id', studentId)
      .eq('unit_id', unit.id)
      .eq('area', activity.area)
      .maybeSingle()

    if (existing) {
      const newTotal = existing.total_attempts + 1
      const newCorrect = existing.correct_attempts + (isCorrect ? 1 : 0)
      await supabase.from('student_progress').update({
        total_attempts: newTotal,
        correct_attempts: newCorrect,
        accuracy_percentage: Math.round((newCorrect / newTotal) * 100),
        last_activity_at: new Date().toISOString(),
      }).eq('id', existing.id)
    } else {
      await supabase.from('student_progress').insert({
        student_id: studentId,
        unit_id: unit.id,
        area: activity.area,
        total_attempts: 1,
        correct_attempts: isCorrect ? 1 : 0,
        accuracy_percentage: isCorrect ? 100 : 0,
        last_activity_at: new Date().toISOString(),
      })
    }

    // Update student XP
    if (isCorrect) {
      const { data: student } = await supabase
        .from('students')
        .select('total_xp')
        .eq('id', studentId)
        .single()
      if (student) {
        await supabase.from('students').update({
          total_xp: student.total_xp + activity.xp_reward
        }).eq('id', studentId)
      }
    }
  }

  const handleNext = () => {
    if (current + 1 >= activities.length) {
      setFinished(true)
    } else {
      setCurrent(c => c + 1)
      setSelected(null)
      setAnswered(false)
    }
  }

  if (activities.length === 0) return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 text-center">Loading activities...</div>
    </div>
  )

  const activity = activities[current]
  const progressPct = Math.round(((current + (answered ? 1 : 0)) / activities.length) * 100)

  if (finished) {
    const accuracy = Math.round((score.correct / score.total) * 100)
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
          <div className="text-6xl mb-4">{accuracy >= 80 ? '🏆' : accuracy >= 60 ? '👍' : '💪'}</div>
          <h2 className="text-2xl font-bold mb-2">Unit Complete!</h2>
          <p className="text-gray-500 mb-6">{unit.title}</p>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 rounded-xl p-3">
              <div className="text-2xl font-bold text-blue-600">{score.correct}/{score.total}</div>
              <div className="text-xs text-gray-500">Correct</div>
            </div>
            <div className="bg-green-50 rounded-xl p-3">
              <div className="text-2xl font-bold text-green-600">{accuracy}%</div>
              <div className="text-xs text-gray-500">Accuracy</div>
            </div>
            <div className="bg-yellow-50 rounded-xl p-3">
              <div className="text-2xl font-bold text-yellow-600">+{xpEarned}</div>
              <div className="text-xs text-gray-500">XP Earned</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-bold hover:opacity-90 transition"
          >
            Continue Learning!
          </button>
        </div>
      </div>
    )
  }

  const options = Array.isArray(activity.options) ? activity.options : JSON.parse(activity.options as any || '[]')

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4">
          <div className="flex justify-between items-center text-white mb-3">
            <span className="font-semibold">Unit {unit.number}: {unit.title}</span>
            <button onClick={onClose} className="text-white/70 hover:text-white text-xl">✕</button>
          </div>
          <div className="flex justify-between text-white/80 text-sm mb-2">
            <span>Question {current + 1} of {activities.length}</span>
            <span className="capitalize">{activity.area} • {activity.xp_reward} XP</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2">
            <div className="xp-bar bg-yellow-400 h-2 rounded-full" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        {/* Question */}
        <div className="p-6">
          <p className="text-xl font-semibold text-gray-800 mb-6">{activity.question}</p>

          <div className="space-y-3">
            {options.map((opt: string) => {
              let style = 'border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50'
              if (answered && opt === activity.correct_answer) style = 'border-2 border-green-500 bg-green-50'
              else if (answered && opt === selected && opt !== activity.correct_answer) style = 'border-2 border-red-400 bg-red-50'
              return (
                <button
                  key={opt}
                  onClick={() => handleAnswer(opt)}
                  disabled={answered}
                  className={`w-full text-left px-4 py-3 rounded-xl font-medium transition ${style}`}
                >
                  {opt}
                </button>
              )
            })}
          </div>

          {answered && (
            <div className={`mt-4 p-4 rounded-xl ${selected === activity.correct_answer ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <p className="font-semibold mb-1">
                {selected === activity.correct_answer ? '✅ Correct!' : '❌ Not quite!'}
              </p>
              <p className="text-sm text-gray-600">{activity.explanation}</p>
            </div>
          )}
        </div>

        {answered && (
          <div className="px-6 pb-6">
            <button
              onClick={handleNext}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-bold hover:opacity-90 transition"
            >
              {current + 1 >= activities.length ? 'See Results 🏆' : 'Next Question →'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}