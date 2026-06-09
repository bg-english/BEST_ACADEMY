'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Row { name: string; total_xp: number; level: number }
const medal = (i: number) => (i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`)

export default function Leaderboard({ studentName }: { studentName: string }) {
  const [rows, setRows] = useState<Row[]>([])
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    supabase.rpc('class_leaderboard').then(({ data, error }) => {
      if (!error && Array.isArray(data)) setRows(data as Row[])
    })
  }, [])

  if (rows.length === 0) return null
  const visible = showAll ? rows : rows.slice(0, 5)

  return (
    <section className="glass-card rounded-3xl p-6 border-secondary/20 shadow-xl shadow-secondary/5">
      <h2 className="font-headline-md text-xl mb-6 flex items-center gap-3">
        <span className="material-symbols-outlined text-secondary">military_tech</span>
        Tabla de posiciones
      </h2>
      <div className="space-y-2">
        {visible.map((r, i) => {
          const me = r.name === studentName
          return (
            <div key={`${r.name}-${i}`}
              className={`flex items-center gap-3 p-3 rounded-2xl transition-colors ${
                me ? 'bg-secondary/10 border border-secondary/40 shadow-[0_0_15px_rgba(93,230,255,0.2)]' : 'hover:bg-white/5'
              }`}>
              <span className={`text-xl w-7 text-center ${me ? 'font-headline-md text-secondary' : ''}`}>{medal(i)}</span>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-container to-secondary flex items-center justify-center text-sm font-bold text-on-primary shrink-0">
                {r.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-button-text text-sm truncate ${me ? 'text-secondary' : ''}`}>{r.name}{me ? ' (Tú)' : ''}</p>
                <p className="font-stat-label text-[10px] text-tertiary">{r.total_xp.toLocaleString()} XP</p>
              </div>
            </div>
          )
        })}
      </div>
      {rows.length > 5 && (
        <button onClick={() => setShowAll((s) => !s)}
          className="w-full mt-4 py-3 border border-white/10 rounded-2xl font-button-text text-sm text-on-surface-variant hover:bg-white/5 transition-all">
          {showAll ? 'Ver menos' : 'Ver ranking completo'}
        </button>
      )}
    </section>
  )
}
