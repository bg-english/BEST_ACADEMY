'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { playCelebrationSound, isMuted, setMuted } from '@/lib/sound'

interface Stat {
  label: string
  value: string | number
}

interface Props {
  show: boolean
  emoji?: string
  title: string
  subtitle?: string
  stats?: Stat[]
  buttonLabel?: string
  onClose: () => void
}

const COLORS = ['#fbbf24', '#f97316', '#3b82f6', '#a855f7', '#22c55e', '#ef4444', '#ec4899']

export default function Celebration({
  show, emoji = '🎉', title, subtitle, stats, buttonLabel = '¡Seguir!', onClose,
}: Props) {
  const playedRef = useRef(false)
  const [muted, setMutedState] = useState(false)

  useEffect(() => { setMutedState(isMuted()) }, [])

  useEffect(() => {
    if (show && !playedRef.current) { playedRef.current = true; playCelebrationSound() }
    if (!show) playedRef.current = false
  }, [show])

  const toggleMute = () => {
    const next = !muted
    setMuted(next)
    setMutedState(next)
  }

  // Generamos las piezas de confeti una sola vez por montaje
  const pieces = useMemo(
    () =>
      Array.from({ length: 70 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        duration: 2.2 + Math.random() * 1.8,
        color: COLORS[i % COLORS.length],
        rounded: Math.random() > 0.5,
      })),
    []
  )

  if (!show) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      {/* Confeti */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {pieces.map((p) => (
          <span
            key={p.id}
            className="confetti-piece"
            style={{
              left: `${p.left}%`,
              backgroundColor: p.color,
              borderRadius: p.rounded ? '50%' : '2px',
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
            }}
          />
        ))}
      </div>

      {/* Tarjeta */}
      <div className="relative bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl pop-in">
        <button
          onClick={toggleMute}
          title={muted ? 'Activar sonido' : 'Silenciar'}
          className="absolute top-3 right-3 text-xl text-gray-400 hover:text-gray-600"
        >
          {muted ? '🔇' : '🔊'}
        </button>
        <div className="text-7xl mb-3 emoji-bounce inline-block">{emoji}</div>
        <h2 className="text-2xl font-extrabold text-gray-800 mb-1">{title}</h2>
        {subtitle && <p className="text-gray-500 mb-2">{subtitle}</p>}

        {stats && stats.length > 0 && (
          <div className="flex justify-center gap-6 my-5">
            {stats.map((s) => (
              <div key={s.label}>
                <div className="text-2xl font-bold text-blue-600">{s.value}</div>
                <div className="text-xs text-gray-500">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-4 w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-bold hover:opacity-90 transition"
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  )
}
