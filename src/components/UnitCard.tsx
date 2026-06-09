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

const ICONS = ['🚀', '🛸', '🌌', '⭐']
const RING = ['text-primary', 'text-secondary', 'text-tertiary', 'text-primary']
const ICONBG = ['bg-primary/20', 'bg-secondary/20', 'bg-tertiary/20', 'bg-primary/20']

export default function UnitCard({ unit, progress, isUnlocked }: Props) {
  const router = useRouter()
  const i = (unit.number - 1) % 4
  const C = 2 * Math.PI * 20 // circunferencia (r=20)
  const offset = C * (1 - Math.min(100, progress) / 100)

  if (!isUnlocked) {
    return (
      <div className="glass-card opacity-50 p-6 rounded-3xl border-dashed border-2 border-white/5">
        <div className="flex justify-between items-start mb-6">
          <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-2xl">⭐</div>
          <span className="material-symbols-outlined text-white/20">lock</span>
        </div>
        <h3 className="font-headline-md text-lg text-white/40 mb-1">{unit.title}</h3>
        <p className="font-body-md text-sm text-white/20">{unit.description}</p>
      </div>
    )
  }

  return (
    <button
      onClick={() => router.push(`/unit/${unit.id}`)}
      className="glass-card interactive-card p-6 rounded-3xl text-left w-full">
      <div className="flex justify-between items-start mb-6">
        <div className={`w-12 h-12 rounded-2xl ${ICONBG[i]} flex items-center justify-center text-2xl`}>{ICONS[i]}</div>
        <div className="relative w-12 h-12">
          <svg className="w-full h-full -rotate-90">
            <circle className="text-white/10" cx="24" cy="24" r="20" fill="transparent" stroke="currentColor" strokeWidth="4" />
            <circle className={RING[i]} cx="24" cy="24" r="20" fill="transparent" stroke="currentColor" strokeWidth="4"
              strokeDasharray={C} strokeDashoffset={offset} strokeLinecap="round" />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold">{progress}%</span>
        </div>
      </div>
      <div className="text-[10px] font-stat-label uppercase tracking-wide text-on-surface-variant mb-1">Unit {unit.number}</div>
      <h3 className="font-headline-md text-lg text-white mb-1">{unit.title}</h3>
      <p className="font-body-md text-sm text-on-surface-variant mb-4 line-clamp-2">{unit.description}</p>
      <div className="flex items-center gap-2 text-tertiary">
        <span className="material-symbols-outlined text-sm filled-icon">star</span>
        <span className="font-stat-label text-sm">{unit.xp_reward} XP</span>
      </div>
    </button>
  )
}
