import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import clientPromise from '@/lib/mongodb'

interface CalendarEvent {
  id: string
  title: string
  date: string
  type: 'birthday' | 'holiday' | 'custom'
  recipient?: string
  relationship?: string
  description?: string
  isCustom?: boolean
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    console.log('📅 Calendar API: получаю события из кэша для:', session.user.email)

    // Получаем события из кэша
    const client = await clientPromise
    const db = client.db('spivanka')
    const collection = db.collection('calendar_cache')
    
    const userCache = await collection.findOne({ userEmail: session.user.email })
    
    if (!userCache) {
      console.log('📅 Calendar API: кэш не найден, проверяю подключение календаря')
      
      // Проверяем, подключен ли календарь
      const tokensCollection = db.collection('calendar_tokens')
      const calendarTokens = await tokensCollection.findOne({ userEmail: session.user.email })
      
      if (!calendarTokens || !calendarTokens.accessToken) {
        return NextResponse.json({
          success: false,
          message: 'Календарь не подключен. Необходимо подключить Google Calendar.',
          events: { birthdays: [], holidays: [] },
          total: 0,
          needsCalendarAuth: true
        })
      }
      
      return NextResponse.json({
        success: false,
        message: 'Календарные события не найдены. Необходима синхронизация.',
        events: { birthdays: [], holidays: [] },
        total: 0,
        needsSync: true
      })
    }
    
    // Проверяем, не устарел ли кэш
    const now = new Date()
    const cacheExpired = now > new Date(userCache.nextSync)
    
    if (cacheExpired) {
      console.log('📅 Calendar API: кэш устарел, но возвращаю данные с предупреждением')
    }

    // Преобразуем кэшированные события в нужный формат
    const calendarEvents: CalendarEvent[] = userCache.events.map((event: any) => ({
      id: event.id,
      title: event.summary,
      date: event.start?.date || event.start?.dateTime || '',
      type: event.type,
      recipient: event.recipient || '',
      relationship: event.relationship || '',
      description: event.description || '',
      isCustom: false
    }))

    // Группируем события по типам
    const birthdayEvents = calendarEvents.filter(event => event.type === 'birthday')
    const holidayEvents = calendarEvents.filter(event => event.type === 'holiday')

    console.log(`📅 Calendar API: возвращаю ${calendarEvents.length} событий из кэша`)
    console.log(`📅 Calendar API: дней рождения: ${birthdayEvents.length}, праздников: ${holidayEvents.length}`)
    
    // Выводим детали событий для отладки
    birthdayEvents.forEach((event, index) => {
      console.log(`📅 День рождения ${index + 1}: "${event.title}" (${event.date})`)
    })
    holidayEvents.forEach((event, index) => {
      console.log(`📅 Праздник ${index + 1}: "${event.title}" (${event.date})`)
    })

    return NextResponse.json({
      success: true,
      events: {
        birthdays: birthdayEvents,
        holidays: holidayEvents
      },
      total: calendarEvents.length,
      lastSync: userCache.lastSync,
      nextSync: userCache.nextSync,
      expired: cacheExpired
    })

  } catch (error) {
    console.error('❌ Calendar API error:', error)
    
    // Показываем тестовые данные при ошибке
    const testEvents = {
      birthdays: [
        {
          id: 'test-1',
          title: 'День рождения Макса',
          date: '2025-04-04',
          type: 'birthday' as const,
          recipient: 'Макс',
          relationship: '',
          description: 'Тестовое событие',
          isCustom: false
        }
      ],
      holidays: [
        {
          id: 'test-2',
          title: 'Новый год',
          date: '2025-01-01',
          type: 'holiday' as const,
          recipient: '',
          relationship: '',
          description: 'Тестовый праздник',
          isCustom: false
        }
      ]
    }

    return NextResponse.json({
      success: false,
      error: 'Ошибка загрузки календарных событий',
      events: testEvents,
      total: 2,
      isDemo: true
    })
  }
} 