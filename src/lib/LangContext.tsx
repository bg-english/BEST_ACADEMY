'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

type Lang = 'es' | 'en'
interface Ctx {
  lang: Lang
  setLang: (l: Lang) => void
  /** Devuelve el texto según el idioma de instrucciones elegido. */
  t: (es: string, en: string) => string
}

const LangCtx = createContext<Ctx>({ lang: 'es', setLang: () => {}, t: (es) => es })

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('es')
  useEffect(() => {
    const s = typeof window !== 'undefined' ? localStorage.getItem('best_lang') : null
    if (s === 'en' || s === 'es') setLangState(s)
  }, [])
  const setLang = (l: Lang) => {
    setLangState(l)
    if (typeof window !== 'undefined') localStorage.setItem('best_lang', l)
  }
  const t = (es: string, en: string) => (lang === 'en' ? en : es)
  return <LangCtx.Provider value={{ lang, setLang, t }}>{children}</LangCtx.Provider>
}

export const useLang = () => useContext(LangCtx)
