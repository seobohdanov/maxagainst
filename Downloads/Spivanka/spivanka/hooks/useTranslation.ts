import { useMemo, useState, useEffect } from 'react'

// Типы для переводов
export type Locale = 'uk' | 'hr'
type TranslationKey = string

// Загружаем переводы
const translations = {
  uk: require('../locales/uk.json'),
  hr: require('../locales/hr.json')
}

// Глобальное состояние для отслеживания изменений
let globalLocale: Locale = 'uk'
let listeners: (() => void)[] = []

// Функция для уведомления слушателей об изменении локали
function notifyListeners() {
  listeners.forEach(listener => listener())
}

export function useTranslation() {
  const [locale, setLocale] = useState<Locale>(globalLocale)
  const [, forceUpdate] = useState({})
  
  // Загружаем сохраненный язык из localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLocale = localStorage.getItem('spivanka-locale') as Locale
      if (savedLocale && (savedLocale === 'uk' || savedLocale === 'hr')) {
        console.log('🌐 Loading saved locale:', savedLocale)
        globalLocale = savedLocale
        setLocale(savedLocale)
      } else {
        // Определяем язык браузера
        const browserLang = navigator.language.split('-')[0]
        const defaultLocale = browserLang === 'hr' ? 'hr' : 'uk'
        console.log('🌐 Setting default locale:', defaultLocale)
        globalLocale = defaultLocale
        setLocale(defaultLocale)
      }
    }
  }, [])

  // Подписываемся на изменения глобального состояния
  useEffect(() => {
    const listener = () => {
      setLocale(globalLocale)
      forceUpdate({})
    }
    listeners.push(listener)
    
    return () => {
      const index = listeners.indexOf(listener)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [])

  const t = useMemo(() => {
    return (key: TranslationKey, params?: Record<string, string | number>): string => {
      console.log('🌐 Translation called:', { key, locale })
      
      const keys = key.split('.')
      let value: any = translations[locale] || translations.uk
      
      for (const k of keys) {
        value = value?.[k]
        if (value === undefined) {
          console.warn(`Translation key not found: ${key} for locale: ${locale}`)
          return key
        }
      }

      if (typeof value !== 'string') {
        console.warn(`Translation value is not a string: ${key} for locale: ${locale}`)
        return key
      }

      // Заменяем параметры
      if (params) {
        return Object.entries(params).reduce((str, [param, val]) => {
          return str.replace(new RegExp(`{{${param}}}`, 'g'), String(val))
        }, value)
      }

      return value
    }
  }, [locale])

  const changeLocale = (newLocale: Locale) => {
    console.log('🔄 Changing locale from', locale, 'to', newLocale)
    if (typeof window !== 'undefined') {
      localStorage.setItem('spivanka-locale', newLocale)
    }
    globalLocale = newLocale
    setLocale(newLocale)
    // Уведомляем все компоненты об изменении
    notifyListeners()
  }

  const isLocale = (loc: Locale) => locale === loc

  return {
    locale,
    changeLocale,
    t,
    isLocale
  }
}

// Хук для получения доступных локалей
export function useLocales() {
  return [
    { code: 'uk', name: 'Українська', flag: '🇺🇦' },
    { code: 'hr', name: 'Hrvatski', flag: '🇭🇷' }
  ]
} 