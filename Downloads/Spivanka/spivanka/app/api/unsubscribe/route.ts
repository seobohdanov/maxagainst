import { NextRequest, NextResponse } from 'next/server'
import { emailService } from '@/services/emailService'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token } = body

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Токен відписки обов\'язковий' },
        { status: 400 }
      )
    }

    // Отписываем пользователя
    const success = await emailService.unsubscribeUser(token)

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Користувач успішно відписався від розсилки'
      })
    } else {
      return NextResponse.json(
        { success: false, error: 'Неправильний токен відписки' },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('❌ Помилка відписки користувача:', error)
    return NextResponse.json(
      { success: false, error: 'Помилка відписки від розсилки' },
      { status: 500 }
    )
  }
} 