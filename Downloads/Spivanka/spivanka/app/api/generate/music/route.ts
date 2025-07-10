import { NextRequest, NextResponse } from 'next/server'
import { generateMusic } from '@/services/sunoService'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { text, formData } = await request.json()

    if (!text || !formData) {
      return NextResponse.json(
        { error: 'Відсутній текст або дані форми' },
        { status: 400 }
      )
    }

    // Получаем сессию для userId
    const session = await getServerSession(authOptions)
    const userId = session?.user?.email

    console.log('🎵 Початок генерації музики...')
    console.log('📝 Текст:', text)
    console.log('📋 Дані форми:', formData)
    console.log('👤 UserId:', userId)

    // Добавляем userId к formData
    const enrichedFormData = {
      ...formData,
      userId: userId || ''
    }

    // Генерируем музыку (получаем taskId)
    const result = await generateMusic(text, enrichedFormData)

    console.log('✅ Завдання створено:', result)

    // Запускаем асинхронную обработку в фоне
    if (result.taskId) {
      processGenerationInBackground(result.taskId, text, enrichedFormData).catch(error => {
        console.error('❌ Помилка асинхронної обробки:', error)
      })
      
      console.log('🚀 Асинхронна обробка запущена для taskId:', result.taskId)
    }

    return NextResponse.json({ 
      success: true, 
      taskId: result.taskId,
      type: result.type
    })

  } catch (error) {
    console.error('❌ Помилка генерації музики:', error)
    
    // Определяем тип ошибки и возвращаем понятное сообщение
    let errorMessage = 'Помилка генерації музики'
    let statusCode = 500
    
    if (error instanceof Error) {
      if (error.message.includes('insufficient') || error.message.includes('credits')) {
        errorMessage = 'На жаль, зараз сервіс тимчасово недоступний через технічні роботи. Спробуйте пізніше.'
        statusCode = 503 // Service Unavailable
      } else if (error.message.includes('rate limit') || error.message.includes('too many requests')) {
        errorMessage = 'Забагато запитів. Зачекайте трохи і спробуйте знову.'
        statusCode = 429 // Too Many Requests
      } else if (error.message.includes('invalid') || error.message.includes('bad request')) {
        errorMessage = 'Помилка в даних запиту. Перевірте текст і спробуйте знову.'
        statusCode = 400 // Bad Request
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        errorMessage = 'Помилка з\'єднання з сервером генерації. Спробуйте пізніше.'
        statusCode = 503 // Service Unavailable
      } else {
        errorMessage = error.message
      }
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: errorMessage,
        details: error instanceof Error ? error.message : 'Невідома помилка'
      },
      { status: statusCode }
    )
  }
}

// Функция для асинхронной обработки генерации в фоне
async function processGenerationInBackground(taskId: string, text: string, formData: any) {
  console.log(`🔄 Запускаю асинхронну обробку для taskId: ${taskId}`)
  
  try {
    // Импортируем функции из сервиса
    const { getGenerationStatus, saveGenerationStatus } = await import('@/services/sunoService')
    
    let attempts = 0
    const maxAttempts = 120 // 20 минут с интервалом 30 секунд
    
    while (attempts < maxAttempts) {
      try {
        console.log(`🔍 Перевірка статусу (спроба ${attempts + 1}/${maxAttempts})...`)
        
        // Получаем актуальный статус от Suno API
        const statusResult = await getGenerationStatus(taskId)
        
        if (statusResult.success && statusResult.status) {
          console.log(`📋 Статус: ${statusResult.status}`)
          
          // Сохраняем статус в базу данных
          await saveGenerationStatus(taskId, statusResult, formData, text)
          console.log(`💾 Статус збережено: ${statusResult.status}`)
          
          // Если генерация завершена, сохраняем результат и выходим
          if (statusResult.status === 'SUCCESS') {
            console.log(`✅ Генерація завершена для taskId: ${taskId}`, statusResult)
            
            // Генерируем обложку для Basic плана, если её нет
            let finalCoverUrl = statusResult.coverUrl || ''
            if (!finalCoverUrl) {
              try {
                console.log('🖼️ Генерую дефолтну обкладинку для Basic плану')
                const { generateCoverArt } = await import('@/services/coverArtService')
                // Используем план из formData или 'basic' по умолчанию
                const plan = formData.plan || 'basic'
                finalCoverUrl = await generateCoverArt(formData, text, plan)
                console.log(`🖼️ Обкладинка згенерована для плану ${plan}:`, finalCoverUrl)
              } catch (coverError) {
                console.error('❌ Помилка генерації обкладинки:', coverError)
                finalCoverUrl = ''
              }
            }
            
            // Сохранение результата теперь происходит на клиенте
            console.log('✅ Генерація завершена, результат буде збережено на клієнті')
            
            return
          }
          
          // Если генерация не удалась, выходим
          if (statusResult.status === 'FAILED' || statusResult.status === 'GENERATE_AUDIO_FAILED') {
            console.error(`❌ Генерація не вдалася для taskId: ${taskId}, статус: ${statusResult.status}`)
            return
          }
        }
        
        attempts++
        await new Promise(resolve => setTimeout(resolve, 15000)) // 15 секунд
      } catch (error) {
        console.error(`❌ Помилка перевірки статусу (спроба ${attempts}):`, error)
        attempts++
        await new Promise(resolve => setTimeout(resolve, 15000))
      }
    }
    
    console.error(`❌ Час очікування вичерпано для taskId: ${taskId}`)
    
  } catch (error) {
    console.error(`❌ Помилка асинхронної обробки для taskId: ${taskId}`, error)
  }
} 