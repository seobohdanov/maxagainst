import { useState, useEffect } from 'react'

export const useBrowserLanguage = () => {
  const [browserLanguage, setBrowserLanguage] = useState<string>('')

  useEffect(() => {
    // Получаем язык браузера
    const language = navigator.language || navigator.languages?.[0] || 'en'
    setBrowserLanguage(language)
  }, [])

  // Проверяем, является ли язык браузера русским
  const isRussianBrowser = browserLanguage.startsWith('ru')

  return {
    browserLanguage,
    isRussianBrowser
  }
} 