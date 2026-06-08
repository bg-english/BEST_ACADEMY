'use client'

import { speak } from '@/lib/tts'

export default function SpeakButton({ text, className = '' }: { text: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); speak(text) }}
      title="Escuchar en inglés"
      className={`shrink-0 text-blue-500 hover:text-blue-700 ${className}`}
    >
      🔊
    </button>
  )
}
