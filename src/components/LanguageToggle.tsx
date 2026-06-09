'use client'

import { useLang } from '@/lib/LangContext'

export default function LanguageToggle({ className = '' }: { className?: string }) {
  const { lang, setLang } = useLang()
  return (
    <button
      type="button"
      onClick={() => setLang(lang === 'es' ? 'en' : 'es')}
      title="Idioma de las instrucciones / Instructions language"
      className={`text-xs font-bold rounded-full px-2.5 py-1 bg-white/20 text-white hover:bg-white/30 transition ${className}`}
    >
      🌐 {lang === 'es' ? 'ES' : 'EN'}
    </button>
  )
}
