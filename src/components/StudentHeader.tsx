import { Student } from '@/lib/types'

interface Props {
  student: Student
  level: number
  xpInLevel: number
  nextLevelXp: number
  onLogout: () => void
}

export default function StudentHeader({ student, level, onLogout }: Props) {
  return (
    <header className="bg-white/10 backdrop-blur border-b border-white/20">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
            {student.name.charAt(0)}
          </div>
          <div>
            <div className="text-white font-semibold text-sm">{student.name}</div>
            <div className="text-blue-300 text-xs">Level {level} Explorer</div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <div className="text-center">
            <div className="text-yellow-400 font-bold text-sm">{student.total_xp} XP</div>
            <div className="text-blue-300 text-xs">Total</div>
          </div>
          <div className="text-center">
            <div className="text-orange-400 font-bold text-sm">🔥 {student.current_streak}</div>
            <div className="text-blue-300 text-xs">Streak</div>
          </div>
          <button
            onClick={onLogout}
            className="text-white/60 hover:text-white text-sm transition"
          >
            Exit
          </button>
        </div>
      </div>
    </header>
  )
}