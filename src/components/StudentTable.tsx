import { Student } from '@/lib/types'

interface Props {
  students: Student[]
  selectedStudent: Student | null
  onSelectStudent: (student: Student) => void
  loading: boolean
}

export default function StudentTable({ students, selectedStudent, onSelectStudent, loading }: Props) {
  return (
    <div className="bg-white rounded-2xl shadow overflow-hidden">
      <div className="p-4 border-b bg-gray-50">
        <h2 className="font-bold text-gray-800">Students Leaderboard</h2>
        <p className="text-gray-500 text-sm">Click to see details</p>
      </div>
      {loading ? (
        <div className="p-8 text-center text-gray-400 animate-pulse">Loading students...</div>
      ) : students.length === 0 ? (
        <div className="p-8 text-center">
          <div className="text-4xl mb-2">👥</div>
          <p className="text-gray-400">No students yet</p>
          <p className="text-sm text-gray-300">Students will appear here when they log in</p>
        </div>
      ) : (
        <div className="divide-y">
          {students.map((student, index) => (
            <div
              key={student.id}
              onClick={() => onSelectStudent(student)}
              className={`flex items-center gap-3 p-4 cursor-pointer transition hover:bg-blue-50 ${selectedStudent?.id === student.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
            >
              <div className="text-lg font-bold text-gray-400 w-6">
                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
              </div>
              <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {student.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-800 truncate text-sm">{student.name}</div>
                <div className="text-xs text-gray-400">🔥 {student.current_streak} streak</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-yellow-600 text-sm">{student.total_xp}</div>
                <div className="text-xs text-gray-400">XP</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}