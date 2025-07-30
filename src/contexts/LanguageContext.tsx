'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface LanguageContextType {
  currentLanguage: string
  setLanguage: (language: string) => void
  getLanguageName: (code: string) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

const languageNames = {
  en: 'English',
  es: 'Spanish',
  zh: 'Chinese', 
  ar: 'Arabic',
  tr: 'Turkish'
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [currentLanguage, setCurrentLanguage] = useState('en')

  // Load saved language from localStorage on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem('immigrantai-language')
    if (savedLanguage && languageNames[savedLanguage as keyof typeof languageNames]) {
      setCurrentLanguage(savedLanguage)
    }
  }, [])

  // Save language to localStorage when it changes
  const setLanguage = (language: string) => {
    setCurrentLanguage(language)
    localStorage.setItem('immigrantai-language', language)
  }

  const getLanguageName = (code: string) => {
    return languageNames[code as keyof typeof languageNames] || 'English'
  }

  return (
    <LanguageContext.Provider value={{ 
      currentLanguage, 
      setLanguage, 
      getLanguageName 
    }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}