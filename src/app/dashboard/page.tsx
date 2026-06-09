'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Student, Unit } from '@/lib/types'
import StudentTable from '@/components/StudentTable'
import TeacherResources from '@/components/TeacherResources'

type Tab = 'overview' | 'manage' | 'resources'

export default function DashboardPage() {
  const [authReady, setAuthReady] = useState(false)
  const [isTeacher, setIsTeacher] = useState(false)
  const [token, setToken] = useState<string | null>(null)

  // login form
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [authBusy, setAuthBusy] = useState(false)

  const [tab, setTab] = useState<Tab>('overview')
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [units, setUnits] = useState<Unit[]>([])
  const [topicsByStudent, setTopicsByStudent] = useState<Record<string, number>>({})
  const [vocabByStudent, setVocabByStudent] = useState<Record<string, number>>({})
  const [practiceByStudent, setPracticeByStudent] = useState<Record<string, Record<number, number>>>({})
  const [loading, setLoading] = useState(true)

  // ---- Auth -------------------------------------------------
  const checkRole = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      setIsTeacher(false)
      setToken(null)
      setAuthReady(true)
      return
    }
    setToken(session.access_token)
    const { data: teacher } = await supabase
      .from('teachers')
      .select('user_id')
      .eq('user_id', session.user.id)
      .maybeSingle()
    setIsTeacher(!!teacher)
    setAuthReady(true)
  }, [])

  useEffect(() => {
    checkRole()
    const { data: sub } = supabase.auth.onAuthStateChange(() => checkRole())
    return () => sub.subscription.unsubscribe()
  }, [checkRole])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError('')
    setAuthBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setAuthBusy(false)
    if (error) setAuthError('Email o contraseña incorrectos.')
  }

  const handleBootstrap = async () => {
    setAuthError('')
    if (!email || !password) { setAuthError('Escribe email y contraseña.'); return }
    setAuthBusy(true)
    const res = await fetch('/api/teacher/bootstrap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const json = await res.json()
    if (!res.ok) {
      setAuthBusy(false)
      setAuthError(json.error || 'No se pudo crear la cuenta de profesor.')
      return
    }
    // Cuenta creada y confirmada: iniciar sesión directamente.
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setAuthBusy(false)
    if (error) setAuthError('Cuenta creada. Inicia sesión con tu email y contraseña.')
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setIsTeacher(false)
    setStudents([])
    setSelectedStudent(null)
  }

  // ---- Data -------------------------------------------------
  const loadStudents = useCallback(async () => {
    const [studRes, unitRes, topicRes, vocabRes, pstatRes] = await Promise.all([
      supabase.from('students').select('*').order('total_xp', { ascending: false }),
      supabase.from('units').select('id, number, title').order('number'),
      supabase.from('student_topic_progress').select('student_id').eq('completed', true),
      supabase.from('student_vocab').select('student_id').eq('sentences_ok', true),
      supabase.from('student_practice_stats').select('student_id, unit_id, level_reached'),
    ])
    if (studRes.data) setStudents(studRes.data as Student[])
    if (unitRes.data) setUnits(unitRes.data as Unit[])

    const tMap: Record<string, number> = {}
    ;(topicRes.data || []).forEach((r: { student_id: string }) => { tMap[r.student_id] = (tMap[r.student_id] || 0) + 1 })
    setTopicsByStudent(tMap)

    const vMap: Record<string, number> = {}
    ;(vocabRes.data || []).forEach((r: { student_id: string }) => { vMap[r.student_id] = (vMap[r.student_id] || 0) + 1 })
    setVocabByStudent(vMap)

    const pMap: Record<string, Record<number, number>> = {}
    ;(pstatRes.data || []).forEach((r: { student_id: string; unit_id: number; level_reached: number }) => {
      pMap[r.student_id] = pMap[r.student_id] || {}
      pMap[r.student_id][r.unit_id] = r.level_reached
    })
    setPracticeByStudent(pMap)

    setLoading(false)
  }, [])

  useEffect(() => {
    if (!isTeacher) return
    loadStudents()
    const channel = supabase
      .channel('student-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => loadStudents())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_practice_stats' }, () => loadStudents())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [isTeacher, loadStudents])

  const handleSelectStudent = (student: Student) => {
    setSelectedStudent(student)
  }

  // ---- Render: not authenticated ----------------------------
  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center text-on-surface-variant font-headline-md animate-pulse">
        Loading…
      </div>
    )
  }

  if (!isTeacher) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-card glow-cyan rounded-3xl p-8 w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">👨‍🏫</div>
            <h1 className="font-headline-md text-2xl text-on-surface">Panel del Profesor</h1>
            <p className="text-on-surface-variant text-sm">BEST Academy</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-3">
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="Email" autoComplete="username"
              className="w-full bg-surface-container-lowest border border-outline-variant/30 text-on-surface rounded-xl px-4 py-3 focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/30 placeholder:text-outline/50"
            />
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña" autoComplete="current-password"
              className="w-full bg-surface-container-lowest border border-outline-variant/30 text-on-surface rounded-xl px-4 py-3 focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/30 placeholder:text-outline/50"
            />
            {authError && <p className="text-sm text-center text-error">{authError}</p>}
            <button type="submit" disabled={authBusy}
              className="w-full bg-gradient-to-r from-primary to-secondary text-on-primary py-3 rounded-xl font-button-text hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50">
              {authBusy ? '…' : 'Entrar'}
            </button>
          </form>
          <div className="mt-4 flex flex-col gap-2">
            <button onClick={handleBootstrap} disabled={authBusy}
              className="text-sm text-secondary hover:underline">Crear cuenta de profesor (primera vez)</button>
            {token && !isTeacher && (
              <p className="text-xs text-center text-amber-400">
                Tu cuenta no tiene rol de profesor. Pide que te añadan a la tabla <code>teachers</code>.
              </p>
            )}
            {token && (
              <button onClick={handleLogout} className="text-xs text-on-surface-variant hover:underline">Cerrar sesión</button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ---- Render: teacher dashboard ----------------------------
  const sumValues = (m: Record<string, number>) => Object.values(m).reduce((a, b) => a + b, 0)
  const avgXp = students.length ? Math.round(students.reduce((s, st) => s + (st.total_xp || 0), 0) / students.length) : 0
  const classCards = [
    { icon: '🎓', label: 'Alumnos', value: students.length },
    { icon: '⭐', label: 'XP promedio', value: avgXp },
    { icon: '📘', label: 'Temas completados', value: sumValues(topicsByStudent) },
    { icon: '🗂️', label: 'Palabras dominadas', value: sumValues(vocabByStudent) },
  ]

  const tabCls = (active: boolean) =>
    `px-4 py-2 rounded-xl font-button-text transition-all ${active ? 'bg-gradient-to-r from-primary to-secondary text-on-primary' : 'glass-card text-on-surface-variant hover:text-on-surface'}`

  return (
    <div className="min-h-screen">
      <header className="h-20 flex items-center px-4 md:px-margin-edge bg-surface/80 backdrop-blur-xl border-b border-white/10">
        <h1 className="font-headline-md text-headline-md font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">BEST Academy</h1>
        <span className="ml-4 text-on-surface-variant text-sm">👨‍🏫 {students.length} alumnos</span>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setTab('overview')} className={tabCls(tab === 'overview')}>
              Resumen
            </button>
            <button onClick={() => setTab('manage')} className={tabCls(tab === 'manage')}>
              Gestionar alumnos
            </button>
            <button onClick={() => setTab('resources')} className={tabCls(tab === 'resources')}>
              Recursos
            </button>
          </div>
          <button onClick={handleLogout} className="text-sm text-on-surface-variant hover:text-on-surface">Cerrar sesión</button>
        </div>

        {tab === 'overview' ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {classCards.map(c => (
                <div key={c.label} className="glass-card rounded-2xl p-4 text-center">
                  <div className="text-3xl mb-1">{c.icon}</div>
                  <div className="font-headline-md text-2xl font-bold text-secondary">{c.value}</div>
                  <div className="text-xs text-on-surface-variant">{c.label}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1">
                <StudentTable
                  students={students}
                  selectedStudent={selectedStudent}
                  onSelectStudent={handleSelectStudent}
                  loading={loading}
                />
              </div>
              <div className="lg:col-span-2">
                {selectedStudent ? (
                  <div className="space-y-6">
                    <div className="glass-card rounded-2xl p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-primary-container to-secondary rounded-full flex items-center justify-center text-on-primary text-2xl font-bold">
                          {selectedStudent.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <h2 className="font-headline-md text-xl text-on-surface truncate">{selectedStudent.name}</h2>
                          <p className="text-on-surface-variant truncate text-sm">{selectedStudent.email}</p>
                        </div>
                        <div className="ml-auto text-right shrink-0">
                          <div className="font-headline-md text-2xl font-bold text-tertiary">{selectedStudent.total_xp} XP</div>
                          <div className="text-sm text-error">🔥 {selectedStudent.current_streak} días</div>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="glass-card rounded-2xl p-4 text-center">
                        <div className="font-headline-md text-2xl font-bold text-primary">Nivel {selectedStudent.level}</div>
                        <div className="text-xs text-on-surface-variant">Nivel</div>
                      </div>
                      <div className="glass-card rounded-2xl p-4 text-center">
                        <div className="font-headline-md text-2xl font-bold text-secondary">{topicsByStudent[selectedStudent.id] || 0}</div>
                        <div className="text-xs text-on-surface-variant">Temas</div>
                      </div>
                      <div className="glass-card rounded-2xl p-4 text-center">
                        <div className="font-headline-md text-2xl font-bold text-tertiary">{vocabByStudent[selectedStudent.id] || 0}</div>
                        <div className="text-xs text-on-surface-variant">Palabras</div>
                      </div>
                    </div>
                    <div className="glass-card rounded-2xl p-6">
                      <h3 className="font-headline-md text-lg text-on-surface mb-4">Práctica por unidad</h3>
                      <div className="space-y-3">
                        {units.map(u => {
                          const lvl = practiceByStudent[selectedStudent.id]?.[u.id] || 0
                          const pct = Math.min(100, Math.round((lvl / 6) * 100))
                          return (
                            <div key={u.id}>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-on-surface font-medium truncate">Unit {u.number}: {u.title}</span>
                                <span className="text-on-surface-variant">Nivel {lvl}/6</span>
                              </div>
                              <div className="w-full bg-surface-container rounded-full h-2">
                                <div className="bg-gradient-to-r from-tertiary to-secondary h-2 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          )
                        })}
                        {units.length === 0 && <p className="text-on-surface-variant text-sm">Sin unidades.</p>}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="glass-card rounded-2xl p-12 text-center">
                    <div className="text-6xl mb-4">👈</div>
                    <h3 className="font-headline-md text-xl text-on-surface">Selecciona un alumno</h3>
                    <p className="text-on-surface-variant">Toca un alumno para ver su progreso detallado</p>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : tab === 'manage' ? (
          <ManageStudents students={students} onChanged={loadStudents} />
        ) : (
          <TeacherResources />
        )}
      </main>
    </div>
  )
}

// ============================================================
// Panel de gestión de alumnos
// ============================================================
function ManageStudents({ students, onChanged }: { students: Student[]; onChanged: () => void }) {
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [pin, setPin] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [bulkText, setBulkText] = useState('')
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ name: string; pin: string }[] | null>(null)
  const [importSkipped, setImportSkipped] = useState<{ name: string; reason: string }[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editAge, setEditAge] = useState('')
  const [editEmail, setEditEmail] = useState('')

  const authHeader = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' }
  }

  const createStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg('')
    if (!name.trim() || !pin.trim()) { setMsg('Nombre y PIN obligatorios.'); return }
    setBusy(true)
    const res = await fetch('/api/students', {
      method: 'POST',
      headers: await authHeader(),
      body: JSON.stringify({ name: name.trim(), age: age || null, pin: pin.trim() }),
    })
    const json = await res.json()
    setBusy(false)
    if (res.ok) {
      setMsg(`✅ Alumno "${name}" creado. PIN: ${pin}`)
      setName(''); setAge(''); setPin('')
      onChanged()
    } else setMsg(`❌ ${json.error}`)
  }

  const importBulk = async () => {
    setMsg('')
    setImportResult(null)
    setImportSkipped([])
    // Cada línea: "Nombre" o "Nombre, edad"
    const list = bulkText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(',')
        const name = parts[0].trim()
        const age = parts[1] ? Number(parts[1].trim()) : null
        return { name, age }
      })
      .filter((s) => s.name)
    if (list.length === 0) { setMsg('Pega al menos un alumno.'); return }
    setImporting(true)
    const res = await fetch('/api/students/import', {
      method: 'POST',
      headers: await authHeader(),
      body: JSON.stringify({ students: list }),
    })
    const json = await res.json()
    setImporting(false)
    if (res.ok) {
      setImportResult(json.created || [])
      setImportSkipped(json.skipped || [])
      onChanged()
    } else setMsg(`❌ ${json.error}`)
  }

  const startEdit = (s: Student) => {
    setEditingId(s.id)
    setEditName(s.name)
    setEditAge(s.age != null ? String(s.age) : '')
    setEditEmail(s.email || '')
    setMsg('')
  }

  const cancelEdit = () => setEditingId(null)

  const saveEdit = async (studentId: string) => {
    setMsg('')
    const res = await fetch('/api/students/update', {
      method: 'POST',
      headers: await authHeader(),
      body: JSON.stringify({
        studentId,
        name: editName.trim(),
        age: editAge,
        email: editEmail.trim(),
      }),
    })
    const json = await res.json()
    if (res.ok) {
      setEditingId(null)
      setMsg('✅ Alumno actualizado.')
      onChanged()
    } else setMsg(`❌ ${json.error}`)
  }

  const resetPin = async (studentId: string, studentName: string) => {
    const newPin = prompt(`Nuevo PIN para ${studentName} (4-8 dígitos):`)
    if (!newPin) return
    const res = await fetch('/api/students/reset-pin', {
      method: 'POST',
      headers: await authHeader(),
      body: JSON.stringify({ studentId, pin: newPin.trim() }),
    })
    const json = await res.json()
    setMsg(res.ok ? `✅ PIN de ${studentName} actualizado.` : `❌ ${json.error}`)
  }

  return (
    <div className="space-y-8">
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="bg-white rounded-2xl p-6 shadow">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Nuevo alumno</h3>
        <form onSubmit={createStudent} className="space-y-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre completo"
            className="w-full border rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <input value={age} onChange={(e) => setAge(e.target.value)} placeholder="Edad (opcional)" type="number"
            className="w-full border rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <input value={pin} onChange={(e) => setPin(e.target.value)} placeholder="PIN (4-8 dígitos)" inputMode="numeric"
            className="w-full border rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <button type="submit" disabled={busy}
            className="w-full bg-blue-600 text-white py-2 rounded-xl font-semibold hover:bg-blue-700 transition disabled:opacity-50">
            {busy ? '…' : 'Crear alumno'}
          </button>
        </form>
        {msg && <p className="text-sm mt-3 text-gray-700">{msg}</p>}
      </div>

      <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Alumnos ({students.length})</h3>
        <div className="divide-y">
          {students.map((s) => (
            editingId === s.id ? (
              <div key={s.id} className="py-3 space-y-2 bg-blue-50 -mx-2 px-2 rounded-lg">
                <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Nombre y apellidos"
                  className="w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <div className="flex gap-2">
                  <input value={editAge} onChange={(e) => setEditAge(e.target.value)} placeholder="Edad" type="number"
                    className="w-24 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="Correo"
                    className="flex-1 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => saveEdit(s.id)}
                    className="bg-green-600 text-white text-sm px-3 py-1 rounded-lg hover:bg-green-700">Guardar</button>
                  <button onClick={cancelEdit}
                    className="bg-gray-200 text-gray-700 text-sm px-3 py-1 rounded-lg hover:bg-gray-300">Cancelar</button>
                </div>
              </div>
            ) : (
              <div key={s.id} className="flex items-center justify-between py-2">
                <div className="min-w-0">
                  <div className="font-medium text-gray-800 truncate">{s.name}{s.age != null && <span className="text-gray-400 font-normal"> · {s.age}</span>}</div>
                  <div className="text-xs text-gray-400 truncate">{s.email}</div>
                </div>
                <div className="flex gap-3 shrink-0 ml-2">
                  <button onClick={() => startEdit(s)}
                    className="text-sm text-gray-600 hover:underline">Editar</button>
                  <button onClick={() => resetPin(s.id, s.name)}
                    className="text-sm text-blue-600 hover:underline">PIN</button>
                </div>
              </div>
            )
          ))}
          {students.length === 0 && <p className="text-gray-400 text-sm py-4">Aún no hay alumnos.</p>}
        </div>
      </div>
    </div>

    <div className="bg-white rounded-2xl p-6 shadow">
      <h3 className="text-lg font-bold text-gray-800 mb-2">Importar lista de clase</h3>
      <p className="text-sm text-gray-500 mb-3">
        Un alumno por línea. Formato: <code>Nombre completo, edad</code> (la edad es opcional).
        Se genera un PIN aleatorio para cada uno.
      </p>
      <textarea
        value={bulkText}
        onChange={(e) => setBulkText(e.target.value)}
        rows={8}
        placeholder={'Maria Garcia, 12\nJuan Perez, 13\nAna Lopez'}
        className="w-full border rounded-xl px-4 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button onClick={importBulk} disabled={importing}
        className="mt-3 bg-purple-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-purple-700 transition disabled:opacity-50">
        {importing ? 'Importando…' : 'Importar alumnos'}
      </button>

      {importResult && (
        <div className="mt-4">
          <p className="font-semibold text-green-700 mb-2">
            ✅ {importResult.length} alumnos creados. Guarda estos PINs y repártelos:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
            {importResult.map((r) => (
              <div key={r.name} className="flex justify-between bg-gray-50 rounded px-3 py-1">
                <span className="truncate mr-2">{r.name}</span>
                <span className="font-mono font-bold">{r.pin}</span>
              </div>
            ))}
          </div>
          {importSkipped.length > 0 && (
            <p className="text-xs text-amber-600 mt-3">
              Omitidos: {importSkipped.map((s) => `${s.name} (${s.reason})`).join(', ')}
            </p>
          )}
        </div>
      )}
    </div>
    </div>
  )
}
