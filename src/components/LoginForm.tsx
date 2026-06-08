'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Student } from '@/lib/types'
import { pinToPassword } from '@/lib/studentAuth'

interface Props {
  onLogin: (student: Student) => void
}

interface RosterEntry {
  name: string
  email: string
}

export default function LoginForm({ onLogin }: Props) {
  const [roster, setRoster] = useState<RosterEntry[]>([])
  const [email, setEmail] = useState('')
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.rpc('class_roster').then(({ data }) => {
      if (data) setRoster(data as RosterEntry[])
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email || !pin.trim()) {
      setError('Elige tu nombre y escribe tu PIN.')
      return
    }
    setLoading(true)

    const { data, error: signInErr } = await supabase.auth.signInWithPassword({
      email,
      password: pinToPassword(pin.trim()),
    })

    if (signInErr || !data.user) {
      setError('PIN incorrecto. Inténtalo de nuevo.')
      setLoading(false)
      return
    }

    const { data: student } = await supabase
      .from('students')
      .select('*')
      .eq('id', data.user.id)
      .maybeSingle()

    setLoading(false)
    if (student) onLogin(student as Student)
    else setError('No encontramos tu perfil. Avisa a tu profesor.')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4 float-animation inline-block">🎓</div>
          <h1 className="text-3xl font-bold text-gray-800">BEST Academy</h1>
          <p className="text-gray-500 mt-2">Your English Learning Adventure!</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
            <select
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition bg-white"
              required
            >
              <option value="">Select your name…</option>
              {roster.map((r) => (
                <option key={r.email} value={r.email}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">PIN</label>
            <input
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition tracking-widest"
              required
            />
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-bold text-lg hover:opacity-90 transition disabled:opacity-50"
          >
            {loading ? 'Loading...' : "Let's Learn! 🚀"}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-4">
          Teacher?{' '}
          <a href="/dashboard" className="text-blue-500 hover:underline">Go to dashboard</a>
        </p>
      </div>
    </div>
  )
}
