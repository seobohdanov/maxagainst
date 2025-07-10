import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { google } from 'googleapis'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    // Получаем токены календаря из отдельной коллекции
    const { MongoClient } = require('mongodb')
    const client = new MongoClient(process.env.MONGODB_URI!)
    await client.connect()
    const db = client.db('spivanka')
    const tokensCollection = db.collection('calendar_tokens')
    
    const calendarTokens = await tokensCollection.findOne({ userEmail: session.user.email })
    
    console.log('🔐 Debug: проверяю токены календаря', {
      hasCalendarTokens: !!calendarTokens,
      hasAccessToken: !!(calendarTokens?.accessToken),
      hasRefreshToken: !!(calendarTokens?.refreshToken),
      userEmail: session.user.email
    })
    
    if (!calendarTokens?.accessToken) {
      return NextResponse.json({ 
        error: 'Календарь не подключен. Необходимо подключить Google Calendar.',
        needsCalendarAuth: true 
      }, { status: 401 })
    }

    const accessToken = calendarTokens.accessToken
    const refreshToken = calendarTokens.refreshToken

    // Настройка Google Calendar API
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    )
    
    auth.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken
    })
    
    // Обработчик обновления токена
    auth.on('tokens', async (tokens) => {
      console.log('🔄 Обновляю токены календаря в debug')
      if (tokens.access_token && session?.user?.email) {
        await tokensCollection.updateOne(
          { userEmail: session.user.email },
          {
            $set: {
              accessToken: tokens.access_token,
              expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
              updatedAt: new Date()
            }
          }
        )
        console.log('✅ Токены календаря обновлены в базе данных')
      }
    })

    const calendar = google.calendar({ version: 'v3', auth })

    // Получаем события на следующий год
    const timeMin = new Date()
    const timeMax = new Date()
    timeMax.setFullYear(timeMax.getFullYear() + 1) // Год вперед от сегодня

    console.log('📅 Debug: запрашиваю события', {
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString()
    })

    // Сначала получаем список всех календарей
    const calendarsResponse = await calendar.calendarList.list()
    const calendars = calendarsResponse.data.items || []
    
    console.log('📅 Debug: найдено календарей:', calendars.length)
    calendars.forEach((cal: any) => {
      console.log(`📅 Календарь: ${cal.summary} (${cal.id})`, {
        primary: cal.primary || false,
        accessRole: cal.accessRole || '',
        colorId: cal.colorId || '',
        description: cal.description || ''
      })
    })

    // Попробуем найти календарь с днями рождения контактов
    try {
      console.log('📅 Debug: ищу календарь с днями рождения контактов...')
      const contactBirthdaysResponse = await calendar.events.list({
        calendarId: '#contacts@group.v.calendar.google.com',
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 250
      })
      
      const contactEvents = contactBirthdaysResponse.data.items || []
      console.log('📅 Debug: найдено дней рождения контактов:', contactEvents.length)
      
      if (contactEvents.length > 0) {
        contactEvents.forEach((event: any) => {
          event.calendarName = 'Дни рождения контактов'
          event.calendarId = '#contacts@group.v.calendar.google.com'
        })
        
        // Добавляем календарь в список, если его там нет
        const contactsCalendar = {
          id: '#contacts@group.v.calendar.google.com',
          summary: 'Дни рождения контактов',
          primary: false,
          accessRole: 'reader'
        }
        calendars.push(contactsCalendar)
      }
    } catch (error) {
      console.log('📅 Debug: календарь с днями рождения контактов недоступен:', error)
    }

    // Получаем события из всех календарей
    const allEvents: any[] = []
    
    for (const cal of calendars) {
      try {
        const response = await calendar.events.list({
          calendarId: cal.id || 'primary',
          timeMin: timeMin.toISOString(),
          timeMax: timeMax.toISOString(),
          singleEvents: true,
          orderBy: 'startTime',
          maxResults: 250,
          // Запрашиваем дополнительные поля для категоризации
          fields: 'items(id,summary,description,start,end,location,attendees,created,updated,eventType,colorId,source,creator,organizer,recurrence,status,transparency,visibility)'
        })
        
        const calendarEvents = response.data.items || []
        console.log(`📅 Debug: из календаря "${cal.summary}" получено ${calendarEvents.length} событий`)
        
        // Добавляем информацию о календаре к каждому событию
        calendarEvents.forEach((event: any) => {
          event.calendarName = cal.summary
          event.calendarId = cal.id
        })
        
        allEvents.push(...calendarEvents)
      } catch (error) {
        console.log(`❌ Ошибка получения событий из календаря "${cal.summary}":`, error)
      }
    }

    const events = allEvents
    
    console.log('📅 Debug: получено событий:', events.length)
    
    // Возвращаем ВСЕ события без фильтрации для отладки
    const processedEvents = events.map((event: any) => ({
      id: event.id || '',
      summary: event.summary || '',
      description: event.description || '',
      start: event.start,
      end: event.end,
      location: event.location || '',
      attendees: event.attendees || [],
      created: event.created,
      updated: event.updated,
      eventType: event.eventType || '',
      colorId: event.colorId || '',
      source: event.source || {},
      recurrence: event.recurrence || [],
      status: event.status || '',
      transparency: event.transparency || '',
      visibility: event.visibility || '',
      creator: event.creator || {},
      organizer: event.organizer || {},
      calendarName: event.calendarName || '',
      calendarId: event.calendarId || ''
    }))

    // Анализируем типы событий
    const eventAnalysis = {
      totalEvents: processedEvents.length,
      summaryKeywords: {} as Record<string, number>,
      eventTypes: {} as Record<string, number>,
      colorIds: {} as Record<string, number>,
      sources: {} as Record<string, number>,
      calendarSources: {} as Record<string, number>,
      hasRecurrence: processedEvents.filter(e => e.recurrence.length > 0).length,
      hasDescription: processedEvents.filter(e => e.description).length
    }

    // Анализируем ключевые слова в названиях
    processedEvents.forEach(event => {
      if (event.summary) {
        const words = event.summary.toLowerCase().split(/\s+/)
        words.forEach((word: string) => {
          if (word.length > 2) {
            eventAnalysis.summaryKeywords[word] = (eventAnalysis.summaryKeywords[word] || 0) + 1
          }
        })
      }
      
      if (event.eventType) {
        eventAnalysis.eventTypes[event.eventType] = (eventAnalysis.eventTypes[event.eventType] || 0) + 1
      }
      
      if (event.colorId) {
        eventAnalysis.colorIds[event.colorId] = (eventAnalysis.colorIds[event.colorId] || 0) + 1
      }
      
      if (event.source && event.source.title) {
        eventAnalysis.sources[event.source.title] = (eventAnalysis.sources[event.source.title] || 0) + 1
      }
      
      if (event.calendarName) {
        eventAnalysis.calendarSources[event.calendarName] = (eventAnalysis.calendarSources[event.calendarName] || 0) + 1
      }
    })

    console.log('📊 Debug: анализ событий:', eventAnalysis)

    return NextResponse.json({
      success: true,
      analysis: eventAnalysis,
      events: processedEvents,
      timeRange: {
        from: timeMin.toISOString(),
        to: timeMax.toISOString()
      }
    })

  } catch (error: any) {
    console.error('❌ Ошибка получения событий календаря (debug):', error)
    
    return NextResponse.json({ 
      error: 'Ошибка получения событий календаря',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
} 