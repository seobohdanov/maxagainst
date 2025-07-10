import { NextRequest, NextResponse } from 'next/server'
import { getGenerationStatus } from '@/services/sunoService'
import clientPromise from '@/lib/mongodb'

const SUNO_API_KEY = process.env.NEXT_PUBLIC_SUNO_API_KEY
const SUNO_API_URL = 'https://apibox.erweima.ai'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Запит на перевірку статусу генерації музики')
    
    // Получаем taskId из query параметров
    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get('taskId')
    
    // Если taskId не указан, возвращаем все статусы для дашборда
    if (!taskId) {
      try {
        const client = await clientPromise
        const db = client.db()
        
        // Получаем все незавершенные статусы из БД
        const statuses = await db.collection('generation_status')
          .find({
            status: { 
              $nin: ['SUCCESS', 'FAILED', 'GENERATE_AUDIO_FAILED'] 
            },
            createdAt: { 
              $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // За последние 24 часа
            }
          })
          .sort({ createdAt: -1 })
          .limit(50)
          .toArray()
        
        return NextResponse.json({
          success: true,
          statuses: statuses.map(status => ({
            taskId: status.taskId,
            status: status.status,
            formData: status.formData,
            text: status.text,
            createdAt: status.createdAt,
            updatedAt: status.updatedAt
          }))
        })
      } catch (dbError) {
        console.error('❌ Помилка отримання статусів з БД:', dbError)
        return NextResponse.json({ 
          success: false, 
          error: 'Помилка отримання статусів',
          statuses: []
        }, { status: 500 })
      }
    }
    
    if (!SUNO_API_KEY) {
      return NextResponse.json({ error: 'Suno API key not configured' }, { status: 500 })
    }
    
    console.log(`🔍 Перевіряю статус для taskId: ${taskId}`)
    
    const result = await getGenerationStatus(taskId)
    
    // Проверяем, что результат валидный
    if (!result || result.error) {
      console.log('⚠️ Результат від Suno API невалідний:', result)
      
      // Определяем тип ошибки и возвращаем понятное сообщение
      let errorMessage = 'Не вдалося отримати статус від Suno API'
      let statusCode = 404
      
      if (result?.error) {
        if (result.error.includes('insufficient') || result.error.includes('credits')) {
          errorMessage = 'На жаль, зараз сервіс тимчасово недоступний через технічні роботи. Спробуйте пізніше.'
          statusCode = 503 // Service Unavailable
        } else if (result.error.includes('rate limit') || result.error.includes('too many requests')) {
          errorMessage = 'Забагато запитів. Зачекайте трохи і спробуйте знову.'
          statusCode = 429 // Too Many Requests
        } else if (result.error.includes('invalid') || result.error.includes('bad request')) {
          errorMessage = 'Помилка в даних запиту. Перевірте taskId і спробуйте знову.'
          statusCode = 400 // Bad Request
        } else if (result.error.includes('network') || result.error.includes('fetch')) {
          errorMessage = 'Помилка з\'єднання з сервером генерації. Спробуйте пізніше.'
          statusCode = 503 // Service Unavailable
        } else {
          errorMessage = result.error
        }
      }
      
      return NextResponse.json({ 
        success: false, 
        error: errorMessage,
        details: result?.details || result?.error
      }, { status: statusCode })
    }
    
    // Дополнительно получаем данные из базы данных
    try {
      const client = await clientPromise
      const db = client.db()
      const statusRecord = await db.collection('generation_status').findOne({ taskId })
      
      if (statusRecord) {
        // Объединяем данные из Suno API с данными из базы
        result.formData = statusRecord.formData || {}
        result.text = statusRecord.text || ''
        console.log('✅ Дані з БД додано до результату')
        console.log('📝 Текст з БД:', result.text?.substring(0, 100))
      } else {
        console.log('⚠️ Запис не знайдено в БД, використовую тільки дані з Suno API')
      }
    } catch (dbError) {
      console.log('⚠️ Не вдалося отримати дані з БД:', dbError)
      // Не возвращаем ошибку, продолжаем с данными только из Suno API
    }
    
    // Добавляем логирование для отладки статуса TEXT_SUCCESS
    if (result.status === 'TEXT_SUCCESS') {
      console.log('📝 Статус TEXT_SUCCESS, текст:', result.text?.substring(0, 100))
      console.log('📝 Повний результат для TEXT_SUCCESS:', JSON.stringify(result, null, 2))
    }
    
    // НЕ сохраняем статус здесь, чтобы избежать циклов
    // Сохранение происходит только в processGenerationInBackground на бэкенде

    return NextResponse.json(result)
  } catch (error) {
    console.error('❌ Помилка перевірки статусу:', error)
    
    // Определяем тип ошибки и возвращаем понятное сообщение
    let errorMessage = 'Внутрішня помилка сервера'
    let statusCode = 500
    
    if (error instanceof Error) {
      if (error.message.includes('network') || error.message.includes('fetch')) {
        errorMessage = 'Помилка з\'єднання з сервером генерації. Спробуйте пізніше.'
        statusCode = 503 // Service Unavailable
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Час очікування вичерпано. Спробуйте пізніше.'
        statusCode = 408 // Request Timeout
      } else {
        errorMessage = error.message
      }
    }
    
    return NextResponse.json({ 
      success: false,
      error: errorMessage,
      details: error instanceof Error ? error.message : 'Невідома помилка'
    }, { status: statusCode })
  }
}

function getStatusMessage(status: string): string {
  switch (status) {
    case 'pending':
      return 'Завдання очікує обробки'
    case 'processing':
      return 'Музика генерується...'
    case 'complete':
    case 'finished':
      return 'Генерація завершена!'
    case 'failed':
      return 'Генерація не вдалася'
    default:
      return 'Невідомий статус'
  }
} 