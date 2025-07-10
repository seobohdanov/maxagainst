import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { FormData, GenerationStatus, Plan, ApiResponse } from '@/types'

/**
 * Утилита для объединения CSS классов
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Валидация данных формы
 */
export function validateFormData(formData: Partial<FormData>): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!formData.recipientName?.trim()) {
    errors.push('Ім\'я отримувача обов\'язкове')
  }

  if (!formData.occasion?.trim()) {
    errors.push('Подія обов\'язкова')
  }

  if (!formData.relationship?.trim()) {
    errors.push('Стосунки обов\'язкові')
  }

  if (!formData.voiceType?.trim()) {
    errors.push('Тип голосу обов\'язковий')
  }

  // Валидация музыкального стиля в зависимости от useStarStyle
  if (formData.useStarStyle) {
    if (!formData.artistStyle?.trim()) {
      errors.push('Стиль виконавця обов\'язковий')
    }
  } else {
    if (!formData.musicStyle?.trim()) {
      errors.push('Музичний стиль обов\'язковий')
    }
  }

  if (!formData.mood?.trim()) {
    errors.push('Настрій обов\'язковий')
  }

  if (!formData.greetingLanguage?.trim()) {
    errors.push('Мова привітання обов\'язкова')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Генерация уникального ID
 */
export function generateId(prefix: string = 'id'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Безопасное преобразование в строку для рендера
 */
export function safeString(value: any): string {
  if (typeof value === 'string') return value
  if (value == null) return ''
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

/**
 * Форматирование цены
 */
export function formatPrice(price: number, currency: string = '₴'): string {
  return `${price}${currency}`
}

/**
 * Форматирование даты
 */
export function formatDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj.toLocaleDateString('uk-UA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Получение цены по плану
 */
export function getPlanPrice(plan: Plan): number {
  return plan === 'premium' ? 399 : 199
}

/**
 * Получение названия плана
 */
export function getPlanName(plan: Plan): string {
  return plan === 'premium' ? 'Преміум' : 'Базовий'
}

/**
 * Проверка статуса генерации
 */
export function isGenerationComplete(status: GenerationStatus): boolean {
  return status === 'SUCCESS'
}

export function isGenerationFailed(status: GenerationStatus): boolean {
  return status === 'FAILED' || status === 'GENERATE_AUDIO_FAILED'
}

export function isGenerationInProgress(status: GenerationStatus): boolean {
  return ['PENDING', 'TEXT_SUCCESS', 'FIRST_SUCCESS'].includes(status)
}

/**
 * Обработка API ошибок
 */
export function handleApiError(error: unknown): ApiResponse {
  console.error('API Error:', error)
  
  if (error instanceof Error) {
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return {
        success: false,
        error: 'Помилка з\'єднання з сервером. Перевірте інтернет і спробуйте знову.'
      }
    }
    
    if (error.message.includes('rate limit') || error.message.includes('too many requests')) {
      return {
        success: false,
        error: 'Забагато запитів. Зачекайте трохи і спробуйте знову.'
      }
    }
    
    if (error.message.includes('unauthorized') || error.message.includes('401')) {
      return {
        success: false,
        error: 'Необхідна авторизація. Увійдіть в акаунт.'
      }
    }
    
    return {
      success: false,
      error: error.message
    }
  }
  
  return {
    success: false,
    error: 'Невідома помилка. Спробуйте ще раз.'
  }
}

/**
 * Задержка для rate limiting
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Проверка на клиентской стороне
 */
export function isClient(): boolean {
  return typeof window !== 'undefined'
}

/**
 * Безопасный доступ к localStorage
 */
export function safeLocalStorage() {
  if (!isClient()) return null
  
  return {
    getItem: (key: string) => {
      try {
        return localStorage.getItem(key)
      } catch {
        return null
      }
    },
    setItem: (key: string, value: string) => {
      try {
        localStorage.setItem(key, value)
      } catch {
        // ignore
      }
    },
    removeItem: (key: string) => {
      try {
        localStorage.removeItem(key)
      } catch {
        // ignore
      }
    }
  }
}

/**
 * Обрезка текста
 */
export function truncateText(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

/**
 * Получает динамические цены планов из настроек приложения
 */
export async function getPlanPrices(): Promise<{ basicPrice: number; premiumPrice: number }> {
  try {
    const response = await fetch('/api/admin/settings')
    if (response.ok) {
      const settings = await response.json()
      return {
        basicPrice: settings.basicPlanPrice || 100,
        premiumPrice: settings.premiumPlanPrice || 200
      }
    }
  } catch (error) {
    console.error('Ошибка получения цен планов:', error)
  }
  
  // Возвращаем дефолтные цены при ошибке
  return {
    basicPrice: 100,
    premiumPrice: 200
  }
}

/**
 * Вычисляет цену для плана
 */
export function calculatePlanPrice(plan: string, basicPrice: number = 100, premiumPrice: number = 200): number {
  return plan === 'premium' ? premiumPrice : basicPrice
} 