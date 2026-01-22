import { useState, useRef, useEffect } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const languages = [
    { code: 'vi' as const, label: 'Vietnamese', native: 'Tiếng Việt' },
    { code: 'en' as const, label: 'English', native: 'Tiếng Anh' },
  ]

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 flex items-center justify-center rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition-colors border border-slate-700 font-bold text-sm uppercase"
        title="Change language"
      >
        {language.toUpperCase()}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-slate-800 rounded-lg shadow-xl border border-slate-700 overflow-hidden z-50">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setLanguage(lang.code)
                setIsOpen(false)
              }}
              className={`w-full px-4 py-3 text-left hover:bg-slate-700 transition-colors flex items-center justify-between ${
                language === lang.code ? 'bg-slate-700 text-primary' : 'text-white'
              }`}
            >
              <div className="flex flex-col">
                <span className="text-sm font-medium">{lang.label}</span>
                <span className="text-xs text-slate-400">{lang.native}</span>
              </div>
              {language === lang.code && (
                <span className="text-primary text-xs">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
