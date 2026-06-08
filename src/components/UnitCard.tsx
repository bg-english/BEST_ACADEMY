'use client'

import { useRouter } from 'next/navigation'
import { Unit } from '@/lib/types'

interface Props {
  unit: Unit
  progress: number
  isUnlocked: boolean
  studentId: string
  onComplete: () => void
}

const UNIT_COLORS = [
  'from-blue-500 to-cyan-500',
  'from-green-500 to-emerald-500',
  'from-purple-500 to-pink-500',
  'from-orange-500 to-red-500',
]

const UNIT_ICONS = ['🗣️', '🏫', '👨‍👩‍👧', '📅']

export default function UnitCard({ unit, progress, isUnlocked }: Props) {
  const router = useRouter()
  const colorClass = UNIT_COLORS[(unit.number - 1) % UNIT_COLORS.length]
  const icon = UNIT_ICONS[(unit.number - 1) % UNIT_ICONS.length]

  return (
    <>
      <div
        className={`card-hover rounded-2xl overflow-hidden shadow-lg cursor-pointer ${!isUnlocked ? 'opacity-60' : ''}`}
        onClick={() => isUnlocked && router.push(`/unit/${unit.id}`)}
      >
        <div className={`bg-gradient-to-br ${colorClass} p-6 text-white`}>
          <div className="flex justify-between items-start mb-4">
            <span className="text-4xl">{icon}</span>
            {!isUnlocked && <span className="text-2xl">🔒</span>}
            {isUnlocked && progress === 100 && <span className="text-2xl">✅</span>}
          </div>
          <div className="text-xs font-semibold opacity-80 mb-1">UNIT {unit.number}</div>
          <h3 className="text-lg font-bold mb-1">{unit.title}</h3>
          <p className="text-xs opacity-80 line-clamp-2">{unit.description}</p>
        </div>

        <div className="bg-white p-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-500">Progress</span>
            <span className="font-bold text-gray-700">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
            <div
              className={`xp-bar bg-gradient-to-r ${colorClass} h-2 rounded-full`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400">
            <span>⏱ {unit.duration_hours}h</span>
            <span>⭐ {unit.xp_reward} XP</span>
          </div>
        </div>
      </div>
    </>
  )
}