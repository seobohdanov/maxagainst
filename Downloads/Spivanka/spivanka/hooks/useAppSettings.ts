'use client'

import { useState, useEffect } from 'react'

interface Settings {
  appName: string
  appLogo: string
  basicPlanPrice: number
  premiumPlanPrice: number
  maintenanceMode: boolean
}

let cachedSettings: Settings | null = null
let isLoading = false
let loadingPromise: Promise<Settings | null> | null = null

export const useAppSettings = () => {
  const [settings, setSettings] = useState<Settings | null>(cachedSettings)
  const [isSettingsLoading, setIsSettingsLoading] = useState(!cachedSettings)

  useEffect(() => {
    const loadSettings = async () => {
      // Если настройки уже загружены, используем их
      if (cachedSettings) {
        setSettings(cachedSettings)
        setIsSettingsLoading(false)
        return
      }

      // Если уже идет загрузка, ждем ее завершения
      if (isLoading && loadingPromise) {
        const result = await loadingPromise
        setSettings(result)
        setIsSettingsLoading(false)
        return
      }

      // Начинаем загрузку
      isLoading = true
      loadingPromise = loadSettingsFromAPI()
      
      try {
        const result = await loadingPromise
        cachedSettings = result
        setSettings(result)
      } catch (error) {
        console.error('Ошибка загрузки настроек:', error)
      } finally {
        setIsSettingsLoading(false)
        isLoading = false
        loadingPromise = null
      }
    }

    loadSettings()
  }, [])

  return { settings, isSettingsLoading }
}

const loadSettingsFromAPI = async (): Promise<Settings | null> => {
  try {
    // Проверяем кэш в localStorage
    const cachedSettings = localStorage.getItem('app-settings')
    if (cachedSettings) {
      try {
        const parsed = JSON.parse(cachedSettings)
        // Проверяем, что кэш не старше 5 минут
        if (parsed.timestamp && Date.now() - parsed.timestamp < 5 * 60 * 1000) {
          return parsed.data
        }
      } catch (e) {
        localStorage.removeItem('app-settings')
      }
    }

    const response = await fetch('/api/admin/settings')
    if (response.ok) {
      const data = await response.json()
      if (data.basicPlanPrice && data.premiumPlanPrice) {
        // Кэшируем настройки
        localStorage.setItem('app-settings', JSON.stringify({
          data,
          timestamp: Date.now()
        }))
        return data
      }
    }
  } catch (error) {
    console.error('Ошибка загрузки настроек:', error)
  }
  
  return null
} 