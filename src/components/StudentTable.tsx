import { Student } from '@/lib/types'

interface Props {
  students: Student[]
  selectedStudent: Student | null
  onSelectStudent: (student: Student) => void
  loading: boolean
}

export default function StudentTable({ students, selectedStudent, onSelectStudent, loading }: Props) {
  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-white/10">
        <h2 className="font-headline-md text-on-surface">Ranking de alumnos</h2>
        <p className="text-on-surface-variant text-sm">Toca para ver detalles</p>
      </div>
      {loading ? (
        <div className="p-8 text-center text-on-surface-variant animate-pulse">Cargando alumnos…</div>
      ) : students.length === 0 ? (
        <div className="p-8 text-center">
          <div className="text-4xl mb-2">👥</div>
          <p className="text-on-surface-variant">Aún no hay alumnos</p>
          <p className="text-sm text-outline">Aparecerán aquí cuando inicien sesión</p>
        </div>
      ) : (
        <div className="divide-y divide-white/5">
          {students.map((student, index) => (
            <div
              key={student.id}
              onClick={() => onSelectStudent(student)}
              className={`flex items-center gap-3 p-4 cursor-pointer transition hover:bg-white/5 ${selectedStudent?.id === student.id ? 'bg-secondary/10 border-l-4 border-secondary' : ''}`}
            >
              <div className="text-lg font-bold text-on-surface-variant w-6">
                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
              </div>
              <div className="w-9 h-9 bg-gradient-to-br from-primary-container to-secondary rounded-full flex items-center justify-center text-on-primary font-bold text-sm flex-shrink-0">
                {student.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-button-text text-on-surface truncate text-sm">{student.name}</div>
                <div className="text-xs text-on-surface-variant">🔥 {student.current_streak}</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-tertiary text-sm">{student.total_xp}</div>
                <div className="text-xs text-on-surface-variant">XP</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}