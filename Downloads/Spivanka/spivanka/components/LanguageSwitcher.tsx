'use client'

import { useState } from 'react'
import { useTranslation, useLocales } from '@/hooks/useTranslation'

interface LanguageSwitcherProps {
  variant?: 'light' | 'dark'
}

export default function LanguageSwitcher({ variant = 'dark' }: LanguageSwitcherProps) {
  const { locale, changeLocale } = useTranslation()
  const locales = useLocales()
  const [isOpen, setIsOpen] = useState(false)

  const currentLocale = locales.find(l => l.code === locale) || locales[0]
  
  console.log('🌐 LanguageSwitcher:', { locale, currentLocale, variant })

  // Стили для разных вариантов
  const getButtonStyles = () => {
    if (variant === 'light') {
      return 'bg-gray-100 hover:bg-gray-200 text-gray-700'
    }
    return 'bg-white/10 hover:bg-white/20 text-white'
  }

  const getTextStyles = () => {
    if (variant === 'light') {
      return 'text-gray-700'
    }
    return 'text-white'
  }

  const getIconStyles = () => {
    if (variant === 'light') {
      return 'text-gray-700'
    }
    return 'text-white'
  }

  return (
    <div className="relative">
      <button
        onClick={() => {
          console.log('🔘 LanguageSwitcher button clicked, isOpen:', !isOpen)
          setIsOpen(!isOpen)
        }}
        className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${getButtonStyles()}`}
      >
        <span className="text-lg">{currentLocale.flag}</span>
        <span className={`text-sm font-medium ${getTextStyles()}`}>{currentLocale.name}</span>
        <svg
          className={`w-4 h-4 transition-transform ${getIconStyles()} ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="py-1">
            {locales.map((loc) => (
              <button
                key={loc.code}
                onClick={() => {
                  console.log('🔄 Switching to locale:', loc.code)
                  changeLocale(loc.code as 'uk' | 'hr')
                  setIsOpen(false)
                }}
                className={`w-full flex items-center space-x-3 px-4 py-2 text-left hover:bg-gray-50 transition-colors ${
                  locale === loc.code ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                }`}
              >
                <span className="text-lg">{loc.flag}</span>
                <span className="text-sm font-medium">{loc.name}</span>
                {locale === loc.code && (
                  <svg className="w-4 h-4 ml-auto text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Overlay для закрытия при клике вне */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
} 