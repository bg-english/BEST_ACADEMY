'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Row {
  name: string
  total_xp: number
  level: number
}

const medal = (i: number) => (i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`)

export default function Leaderboard({ studentName }: { studentName: string }) {
  const [rows, setRows] = useState<Row[]>([])

  useEffect(() => {
    supabase.rpc('class_leaderboard').then(({ data, error }) => {
      if (!error && Array.isArray(data)) setRows(data as Row[])
    })
  }, [])

  if (rows.length === 0) return null

  return (
    <div className="max-w-md mx-auto bg-white/10 rounded-2xl p-5">
      <h2 className="text-xl font-bold text-white mb-4 text-center">🏆 Ranking de la clase</h2>
      <div className="space-y-1.5">
        {rows.slice(0, 10).map((r, i) => {
          const me = r.name === studentName
          return (
            <div
              key={`${r.name}-${i}`}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 ${me ? 'bg-yellow-400/90 text-gray-900 font-bold' : 'bg-white/10 text-white'}`}
            >
              <span className="w-7 text-center text-lg">{medal(i)}</span>
              <span className="flex-1 truncate">{r.name}{me ? ' (tú)' : ''}</span>
              <span className="text-sm whitespace-nowrap">⭐ {r.total_xp} XP</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
