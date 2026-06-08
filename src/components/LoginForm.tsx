'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Student } from '@/lib/types'

interface Props {
  onLogin: (student: Student) => void
}

export default function LoginForm({ onLogin }: Props) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !email.trim()) return
    setLoading(true)

    // Check if student exists
    const { data: existing } = await supabase
      .from('students')
      .select('*')
      .eq('email', email.toLowerCase())
      .single()

    if (existing) {
      onLogin(existing)
    } else {
      // Create new student
      const { data: newStudent, error } = await supabase
        .from('students')
        .insert({ name: name.trim(), email: email.toLowerCase(), total_xp: 0, current_streak: 0, level: 1 })
        .select()
        .single()
      if (newStudent) onLogin(newStudent)
    }
    setLoading(false)
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
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Maria Garcia"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition"
              required
            />
          </div>
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