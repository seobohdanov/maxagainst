import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import clientPromise from '@/lib/mongodb'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    console.log('📅 Проверяю статус авторизации календаря для:', session.user.email)

    // Получаем токены календаря из базы данных
    const client = await clientPromise
    const db = client.db('spivanka')
    const collection = db.collection('calendar_tokens')

    const calendarTokens = await collection.findOne({ userEmail: session.user.email })

    if (!calendarTokens) {
      console.log('📅 Токены календаря не найдены')
      return NextResponse.json({
        connected: false,
        message: 'Календарь не подключен'
      })
    }

    // Проверяем, не истекли ли токены
    const now = new Date()
    const isExpired = calendarTokens.expiresAt && now > calendarTokens.expiresAt

    console.log('📅 Статус токенов календаря:', {
      hasAccessToken: !!calendarTokens.accessToken,
      hasRefreshToken: !!calendarTokens.refreshToken,
      expiresAt: calendarTokens.expiresAt,
      isExpired
    })

    return NextResponse.json({
      connected: true,
      hasAccessToken: !!calendarTokens.accessToken,
      hasRefreshToken: !!calendarTokens.refreshToken,
      expiresAt: calendarTokens.expiresAt,
      isExpired,
      scope: calendarTokens.scope,
      connectedAt: calendarTokens.createdAt
    })
    
  } catch (error) {
    console.error('❌ Ошибка проверки статуса календаря:', error)
    return NextResponse.json({ 
      error: 'Ошибка проверки статуса календаря',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 })
  }
} 