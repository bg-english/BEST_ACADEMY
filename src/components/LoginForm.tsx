'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Student } from '@/lib/types'
import { pinToPassword } from '@/lib/studentAuth'

interface Props {
  onLogin: (student: Student) => void
}
interface RosterEntry { name: string; email: string }
interface Star { left: string; top: string; size: number; duration: string; opacity: number }

export default function LoginForm({ onLogin }: Props) {
  const [roster, setRoster] = useState<RosterEntry[]>([])
  const [email, setEmail] = useState('')
  const [digits, setDigits] = useState(['', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [stars, setStars] = useState<Star[]>([])
  const inputs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    supabase.rpc('class_roster').then(({ data }) => { if (data) setRoster(data as RosterEntry[]) })
    // Estrellas (en cliente para evitar mismatch de hidratación)
    setStars(Array.from({ length: 70 }, () => ({
      left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
      size: Math.random() * 2.5 + 0.5, duration: `${2 + Math.random() * 5}s`, opacity: Math.random() * 0.7 + 0.2,
    })))
  }, [])

  const setDigit = (i: number, v: string) => {
    const c = v.replace(/\D/g, '').slice(-1)
    const next = [...digits]; next[i] = c; setDigits(next)
    if (c && i < 3) inputs.current[i + 1]?.focus()
  }
  const onKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) inputs.current[i - 1]?.focus()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const pin = digits.join('')
    if (!email || pin.length < 4) { setError('Elige tu nombre y escribe tu PIN de 4 dígitos.'); return }
    setLoading(true)
    const { data, error: signInErr } = await supabase.auth.signInWithPassword({ email, password: pinToPassword(pin) })
    if (signInErr || !data.user) { setError('PIN incorrecto. Inténtalo de nuevo.'); setLoading(false); return }
    const { data: student } = await supabase.from('students').select('*').eq('id', data.user.id).maybeSingle()
    setLoading(false)
    if (student) onLogin(student as Student)
    else setError('No encontramos tu perfil. Avisa a tu profesor.')
  }

  return (
    <div className="relative flex items-center justify-center min-h-screen text-on-surface overflow-hidden px-4">
      {/* Fondo estrellado */}
      <div className="absolute inset-0 pointer-events-none z-0">
        {stars.map((s, i) => (
          <span key={i} className="star" style={{ left: s.left, top: s.top, width: s.size, height: s.size, opacity: s.opacity, ['--duration' as string]: s.duration }} />
        ))}
      </div>

      <main className="relative z-10 w-full max-w-md">
        <form onSubmit={handleSubmit} className="glass-card rounded-[2rem] p-8 sm:p-10 flex flex-col items-center shadow-2xl">
          {/* Marca */}
          <div className="mb-8 text-center">
            <div className="flex items-center justify-center gap-3 mb-2">
              <span className="text-4xl">🚀</span>
              <h1 className="font-display-lg text-headline-md font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">BEST Academy</h1>
            </div>
            <p className="font-body-md text-on-surface-variant">Inicia sesión en tu aventura</p>
          </div>

          <div className="w-full space-y-6">
            {/* Nombre */}
            <div className="space-y-2">
              <label className="font-stat-label text-stat-label text-on-surface-variant uppercase ml-1 block">Selecciona tu nombre</label>
              <div className="relative">
                <select value={email} onChange={(e) => setEmail(e.target.value)} required
                  className="w-full bg-surface-container-lowest/60 border border-outline-variant/40 text-on-surface rounded-xl px-4 py-3.5 appearance-none focus:outline-none focus:border-secondary transition-all font-body-lg cursor-pointer">
                  <option value="" disabled>Elige un estudiante...</option>
                  {roster.map((r) => <option key={r.email} value={r.email}>{r.name}</option>)}
                </select>
                <span className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-outline">▾</span>
              </div>
            </div>

            {/* PIN */}
            <div className="space-y-2">
              <label className="font-stat-label text-stat-label text-on-surface-variant uppercase ml-1 block">Introduce tu PIN</label>
              <div className="flex justify-between gap-3">
                {digits.map((d, i) => (
                  <input key={i} ref={(el) => { inputs.current[i] = el }} type="password" inputMode="numeric" maxLength={1} value={d}
                    onChange={(e) => setDigit(i, e.target.value)} onKeyDown={(e) => onKey(i, e)}
                    className="pin-input w-14 h-16 text-center text-3xl font-display-lg bg-surface-container-lowest/60 border border-outline-variant/40 rounded-xl focus:border-secondary focus:outline-none transition-all text-secondary" />
                ))}
              </div>
            </div>

            {error && <p className="text-error text-sm text-center">{error}</p>}

            {/* Botón */}
            <button type="submit" disabled={loading}
              className="w-full mt-2 group relative overflow-hidden bg-gradient-to-r from-primary to-secondary p-[2px] rounded-xl hover:scale-[1.02] active:scale-95 transition-all duration-200 glow-cyan disabled:opacity-60">
              <div className="bg-surface-container-lowest group-hover:bg-transparent transition-colors rounded-[10px] py-4 flex items-center justify-center gap-2">
                <span className="font-button-text text-button-text text-secondary group-hover:text-surface-container-lowest transition-colors uppercase tracking-widest">
                  {loading ? 'Conectando…' : '¡A aprender! 🚀'}
                </span>
              </div>
            </button>
          </div>

          {/* Footer */}
          <div className="mt-10 flex flex-col items-center gap-4">
            <a href="/dashboard" className="font-body-md text-on-surface-variant hover:text-primary transition-colors flex items-center gap-2">
              🎓 Soy Profesor/a
            </a>
            <div className="h-1 w-12 bg-outline-variant/20 rounded-full" />
            <p className="text-[12px] font-stat-label text-outline/50 uppercase tracking-[0.2em]">Academy Protocol 2.4.0</p>
          </div>
        </form>
      </main>
    </div>
  )
}
