import { NextRequest, NextResponse } from 'next/server'
import { generateCoverArt } from '@/services/coverArtService'

export async function POST(request: NextRequest) {
  try {
    const { formData, text, plan } = await request.json()

    if (!formData || !text || !plan) {
      return NextResponse.json(
        { error: 'Відсутні дані форми, текст або план' },
        { status: 400 }
      )
    }

    console.log('🖼️ Початок генерації обкладинки...')
    console.log('📋 План:', plan)
    console.log('📝 Текст:', text.substring(0, 100))

    // Генерируем обложку
    const coverUrl = await generateCoverArt(formData, text, plan)

    console.log('✅ Обкладинка згенерована:', coverUrl)

    return NextResponse.json({ 
      success: true, 
      coverUrl: coverUrl
    })

  } catch (error) {
    console.error('❌ Помилка генерації обкладинки:', error)
    
    // Определяем тип ошибки и возвращаем понятное сообщение
    let errorMessage = 'Помилка генерації обкладинки'
    let statusCode = 500
    
    if (error instanceof Error) {
      if (error.message.includes('API key') || error.message.includes('OPENAI_API_KEY')) {
        errorMessage = 'Помилка налаштування OpenAI API. Зверніться до адміністратора.'
      } else if (error.message.includes('rate limit') || error.message.includes('too many requests')) {
        errorMessage = 'Забагато запитів. Зачекайте трохи і спробуйте знову.'
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        errorMessage = 'Помилка з\'єднання з сервером. Перевірте інтернет і спробуйте знову.'
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