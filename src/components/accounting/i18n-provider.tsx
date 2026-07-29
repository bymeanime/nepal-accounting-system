'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'
import { type Language, translate, type TranslationKey } from '@/lib/i18n'

interface I18nContextValue {
  lang: Language
  setLang: (l: Language) => void
  t: (key: TranslationKey) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

// Read initial language from localStorage on the client (safe at module load)
function getInitialLang(): Language {
  if (typeof window === 'undefined') return 'en'
  const saved = window.localStorage.getItem('nepal-acct-lang')
  return saved === 'ne' ? 'ne' : 'en'
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(getInitialLang)

  const setLang = (l: Language) => {
    setLangState(l)
    if (typeof window !== 'undefined') localStorage.setItem('nepal-acct-lang', l)
  }

  const t = (key: TranslationKey) => translate(key, lang)

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    return { lang: 'en' as Language, setLang: () => {}, t: (key: TranslationKey) => translate(key, 'en') }
  }
  return ctx
}
