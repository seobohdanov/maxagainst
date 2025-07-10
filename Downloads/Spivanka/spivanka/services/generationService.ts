import type { 
  FormData, 
  GenerationState, 
  GenerationStatus, 
  MusicGenerationStep, 
  Plan,
  GenerationStatusResponse,
  MusicGenerationResult 
} from '@/types'
import { generateId, safeLocalStorage, handleApiError, delay } from '@/lib/utils'
import { safeToast } from '@/lib/toast'

const STORAGE_KEYS = {
  GENERATION_STATE: 'generationState',
  ACTIVE_GENERATION: 'activeGeneration',
  USER_GREETINGS: 'userGreetings'
} as const

export class GenerationService {
  private static instance: GenerationService
  private eventSource: EventSource | null = null
  private isSSEClosed = false
  private maxRetries = 3
  private retryDelay = 2000

  static getInstance(): GenerationService {
    if (!GenerationService.instance) {
      GenerationService.instance = new GenerationService()
    }
    return GenerationService.instance
  }

  /**
   * Инициализация генерации текста
   */
  async generateText(formData: FormData): Promise<{ success: boolean; text?: string; error?: string }> {
    try {
      console.log('📝 Початок генерації тексту')
      
      const response = await fetch('/api/generate/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formData })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Помилка генерації тексту')
      }

      console.log('✅ Текст згенеровано успішно')
      return { success: true, text: result.text }

    } catch (error) {
      console.error('❌ Помилка генерації тексту:', error)
      return handleApiError(error)
    }
  }

  /**
   * Инициализация генерации музыки
   */
  async generateMusic(text: string, formData: FormData): Promise<MusicGenerationResult> {
    try {
      console.log('🎵 Початок генерації музики')
      
      const response = await fetch('/api/generate/music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, formData })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Помилка генерації музики')
      }

      console.log('✅ Завдання генерації музики створено:', result.taskId)
      return {
        success: true,
        taskId: result.taskId,
        type: result.type || 'generation'
      }

    } catch (error) {
      console.error('❌ Помилка генерації музики:', error)
      const errorResult = handleApiError(error)
      return {
        success: false,
        type: 'error',
        error: errorResult.error
      }
    }
  }

  /**
   * Получение статуса генерации
   */
  async getGenerationStatus(taskId: string): Promise<GenerationStatusResponse> {
    try {
      const response = await fetch(`/api/generate/music/status?taskId=${taskId}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return result

    } catch (error) {
      console.error('❌ Помилка отримання статусу:', error)
      return {
        success: false,
        status: 'FAILED',
        type: 'error',
        error: error instanceof Error ? error.message : 'Невідома помилка'
      }
    }
  }

  /**
   * Подключение к SSE для отслеживания статуса
   */
  startSSEConnection(
    taskId: string, 
    onStatusUpdate: (status: GenerationStatus, data: any) => void,
    onComplete: (data: any) => void,
    onError: (error: string) => void
  ): void {
    if (this.eventSource) {
      this.eventSource.close()
    }

    this.isSSEClosed = false
    console.log('🔗 Запуск SSE підключення для taskId:', taskId)

    this.eventSource = new EventSource(`/api/generate/music/stream?taskId=${taskId}`)

    this.eventSource.onopen = () => {
      console.log('🔗 SSE підключення встановлено')
    }

    this.eventSource.onmessage = (event) => {
      if (this.isSSEClosed) return

      try {
        const data = JSON.parse(event.data)
        console.log('📡 SSE повідомлення:', data)

        if (data.type === 'status_update' && data.status) {
          onStatusUpdate(data.status, data.data)
        } else if (data.type === 'generation_complete') {
          onComplete(data.data)
          this.closeSSEConnection()
        } else if (data.type === 'generation_failed' || data.type === 'error') {
          onError(data.error || 'Помилка генерації')
          this.closeSSEConnection()
        } else if (data.type === 'generate_audio_failed') {
          onError('Помилка генерації аудіо. Спробуйте ще раз.')
          this.closeSSEConnection()
        } else if (data.type === 'timeout') {
          onError('Час генерації вичерпано')
          this.closeSSEConnection()
        }
      } catch (error) {
        console.error('❌ Помилка обробки SSE повідомлення:', error)
        onError('Помилка обробки повідомлення')
      }
    }

    this.eventSource.onerror = (error) => {
      console.error('❌ SSE помилка:', error)
      onError('Помилка з\'єднання')
      this.closeSSEConnection()
    }
  }

  /**
   * Закрытие SSE соединения
   */
  closeSSEConnection(): void {
    if (this.eventSource && !this.isSSEClosed) {
      this.eventSource.close()
      this.eventSource = null
      this.isSSEClosed = true
      console.log('🔗 SSE підключення закрито')
    }
  }

  /**
   * Сохранение состояния генерации
   */
  saveGenerationState(state: GenerationState): void {
    const storage = safeLocalStorage()
    if (storage) {
      storage.setItem(STORAGE_KEYS.GENERATION_STATE, JSON.stringify(state))
      console.log('💾 Стан генерації збережено')
    }
  }

  /**
   * Загрузка состояния генерации
   */
  loadGenerationState(): GenerationState | null {
    const storage = safeLocalStorage()
    if (storage) {
      const saved = storage.getItem(STORAGE_KEYS.GENERATION_STATE)
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch (error) {
          console.error('❌ Помилка завантаження стану генерації:', error)
        }
      }
    }
    return null
  }

  /**
   * Очистка состояния генерации
   */
  clearGenerationState(): void {
    const storage = safeLocalStorage()
    if (storage) {
      storage.removeItem(STORAGE_KEYS.GENERATION_STATE)
      storage.removeItem(STORAGE_KEYS.ACTIVE_GENERATION)
      console.log('🧹 Стан генерації очищено')
    }
  }

  /**
   * Установка активной генерации
   */
  setActiveGeneration(taskId: string | null): void {
    const storage = safeLocalStorage()
    if (storage) {
      if (taskId) {
        storage.setItem(STORAGE_KEYS.ACTIVE_GENERATION, taskId)
      } else {
        storage.removeItem(STORAGE_KEYS.ACTIVE_GENERATION)
      }
    }
  }

  /**
   * Получение активной генерации
   */
  getActiveGeneration(): string | null {
    const storage = safeLocalStorage()
    if (storage) {
      return storage.getItem(STORAGE_KEYS.ACTIVE_GENERATION)
    }
    return null
  }

  /**
   * Создание taskId
   */
  createTaskId(prefix: string = 'gen'): string {
    return generateId(prefix)
  }

  /**
   * Получение шага генерации по статусу
   */
  getStepFromStatus(status: GenerationStatus): MusicGenerationStep {
    switch (status) {
      case 'PENDING':
        return 'uploading'
      case 'TEXT_SUCCESS':
        return 'text-processing'
      case 'FIRST_SUCCESS':
        return 'processing'
      case 'SUCCESS':
        return 'complete'
      case 'FAILED':
      case 'GENERATE_AUDIO_FAILED':
        return 'uploading'
      default:
        return 'uploading'
    }
  }

  /**
   * Проверка на завершенность генерации
   */
  isGenerationComplete(status: GenerationStatus): boolean {
    return status === 'SUCCESS'
  }

  /**
   * Проверка на ошибку генерации
   */
  isGenerationFailed(status: GenerationStatus): boolean {
    return status === 'FAILED'
  }

  /**
   * Уведомления для разных статусов
   */
  showStatusNotification(status: GenerationStatus): void {
    switch (status) {
      case 'TEXT_SUCCESS':
        safeToast.success('Текст оброблено! AI створює структуру пісні...')
        break
      case 'FIRST_SUCCESS':
        safeToast.success('Перша версія готова! Створюється фінальна версія...')
        break
      case 'SUCCESS':
        safeToast.success('Музика створена успішно!')
        break
      case 'FAILED':
        safeToast.error('Генерація не вдалася. Спробуйте ще раз.')
        break
      case 'GENERATE_AUDIO_FAILED':
        safeToast.error('Помилка генерації аудіо. Спробуйте ще раз.')
        break
    }
  }

  /**
   * Retry механизм для API запросов
   */
  async retryRequest<T>(
    requestFn: () => Promise<T>,
    maxRetries: number = this.maxRetries,
    delayMs: number = this.retryDelay
  ): Promise<T> {
    let lastError: Error | null = null

    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await requestFn()
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        
        if (i < maxRetries) {
          console.log(`🔄 Повтор ${i + 1}/${maxRetries} через ${delayMs}мс`)
          await delay(delayMs)
          delayMs *= 1.5 // Экспоненциальная задержка
        }
      }
    }

    throw lastError
  }
}

// Экспорт синглтона
export const generationService = GenerationService.getInstance() 