import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import clientPromise from '@/lib/mongodb'

export async function GET(request: NextRequest) {
  try {
    // Проверяем авторизацию админа
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Не авторизований' },
        { status: 401 }
      )
    }

    // Проверяем, является ли пользователь админом
    if (session.user.email !== 'seobohdanov@gmail.com') {
      return NextResponse.json(
        { success: false, error: 'Доступ заборонено' },
        { status: 403 }
      )
    }

    const client = await clientPromise
    const db = client.db()
    const consentCollection = db.collection('user_consents')

    // Получаем все согласия, отсортированные по дате создания
    const consents = await consentCollection
      .find({})
      .sort({ createdAt: -1 })
      .limit(1000) // Ограничиваем количество записей
      .toArray()

    console.log(`✅ Отримано ${consents.length} згод з бази даних`)

    return NextResponse.json({
      success: true,
      consents: consents
    })

  } catch (error) {
    console.error('❌ Помилка отримання згод:', error)
    return NextResponse.json(
      { success: false, error: 'Помилка отримання згод' },
      { status: 500 }
    )
  }
} 