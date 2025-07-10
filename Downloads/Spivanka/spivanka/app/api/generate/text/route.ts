import { NextRequest, NextResponse } from 'next/server'
import { generateGreetingText } from '@/services/geminiService'
import type { FormData } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const formData: FormData = body.formData

    if (!formData) {
      return NextResponse.json(
        { success: false, error: 'Form data is required' },
        { status: 400 }
      )
    }

    // Проверяем обязательные поля
    if (!formData.recipientName || !formData.occasion || !formData.relationship) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: recipientName, occasion, relationship' },
        { status: 400 }
      )
    }

    console.log('📝 Генерація тексту для:', {
      recipientName: formData.recipientName,
      occasion: formData.occasion,
      relationship: formData.relationship,
      language: formData.greetingLanguage
    })

    const generatedText = await generateGreetingText(formData)

    if (!generatedText || generatedText.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Generated text is empty' },
        { status: 500 }
      )
    }

    console.log('✅ Текст згенеровано успішно, довжина:', generatedText.length)

    return NextResponse.json({
      success: true,
      text: generatedText
    })
  } catch (error) {
    console.error('❌ Помилка генерації тексту:', error)
    
    // Определяем тип ошибки и возвращаем понятное сообщение
    let errorMessage = 'Помилка генерації тексту'
    let statusCode = 500
    
    if (error instanceof Error) {
      if (error.message.includes('API key') || error.message.includes('GEMINI_API_KEY')) {
        errorMessage = 'Помилка налаштування API. Зверніться до адміністратора.'
        statusCode = 500
      } else if (error.message.includes('Забагато запитів') || error.message.includes('rate limit') || error.message.includes('too many requests')) {
        errorMessage = 'Забагато запитів. Зачекайте трохи і спробуйте знову.'
        statusCode = 429
      } else if (error.message.includes('перевантажений') || error.message.includes('overloaded')) {
        errorMessage = 'Сервер генерації тимчасово перевантажений. Спробуйте через кілька хвилин.'
        statusCode = 503
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        errorMessage = 'Помилка з\'єднання з сервером генерації. Спробуйте пізніше.'
        statusCode = 503
      } else if (error.message.includes('invalid') || error.message.includes('bad request')) {
        errorMessage = 'Помилка в даних запиту. Перевірте форму і спробуйте знову.'
        statusCode = 400
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