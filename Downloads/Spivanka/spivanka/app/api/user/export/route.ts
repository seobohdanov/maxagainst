import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import clientPromise from '@/lib/mongodb'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const client = await clientPromise
    const db = client.db()
    const userEmail = session.user.email

    // Собираем все данные пользователя
    const userData: any = {
      profile: {
        email: userEmail,
        name: session.user.name,
        image: session.user.image
      },
      greetings: [],
      payments: [],
      calendarTokens: null,
      exportDate: new Date().toISOString()
    }

    // Получаем поздравления
    const greetings = await db.collection('greetings').find({ userEmail }).toArray()
    userData.greetings = greetings

    // Получаем платежи
    const payments = await db.collection('payments').find({ userEmail }).toArray()
    userData.payments = payments

    // Получаем токены календаря (без секретных данных)
    const calendarTokens = await db.collection('calendar_tokens').findOne({ userEmail })
    if (calendarTokens) {
      userData.calendarTokens = {
        connected: true,
        lastSync: calendarTokens.updatedAt
      }
    }

    // Возвращаем JSON файл для скачивания
    const jsonData = JSON.stringify(userData, null, 2)
    const blob = new Blob([jsonData], { type: 'application/json' })
    
    return new NextResponse(blob, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="spivanka-data-${userEmail}-${new Date().toISOString().split('T')[0]}.json"`
      }
    })

  } catch (error) {
    console.error('Ошибка экспорта данных:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 