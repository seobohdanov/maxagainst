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
    
    if (!calendarTokens?.accessToken) {
      return NextResponse.json({ 
        error: 'Календарь не подключен. Необходимо подключить Google Calendar.',
        needsCalendarAuth: true 
      }, { status: 401 })
    }

    const accessToken = calendarTokens.accessToken

    console.log('🔍 Debug: получаю сырые данные календаря для:', session.user.email)

    // Настраиваем Google Calendar API с обработкой refresh token
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    )
    
    auth.setCredentials({
      access_token: accessToken,
      refresh_token: calendarTokens.refreshToken
    })
    
    // Обработчик обновления токена
    auth.on('tokens', async (tokens) => {
      console.log('🔄 Обновляю токены календаря в debug-raw')
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

    // Временные рамки
    const timeMin = new Date()
    const timeMax = new Date()
    timeMax.setFullYear(timeMax.getFullYear() + 1)

    // Получаем список календарей
    const calendarsResponse = await calendar.calendarList.list()
    const calendars = calendarsResponse.data.items || []
    
    console.log('🔍 Debug: найдено календарей:', calendars.length)

    // Добавляем календарь контактов
    const contactsCalendar = {
      id: '#contacts@group.v.calendar.google.com',
      summary: 'Дни рождения контактов',
      primary: false,
      accessRole: 'reader'
    }
    calendars.push(contactsCalendar)

    // Получаем события из каждого календаря
    const calendarData = []
    
    for (const cal of calendars) {
      try {
        console.log(`🔍 Debug: получаю события из календаря "${cal.summary}"...`)
        
        const response = await calendar.events.list({
          calendarId: cal.id || 'primary',
          timeMin: timeMin.toISOString(),
          timeMax: timeMax.toISOString(),
          singleEvents: true,
          orderBy: 'startTime',
          maxResults: 10 // Ограничиваем для debug
        })
        
        const events = response.data.items || []
        console.log(`🔍 Debug: из календаря "${cal.summary}" получено ${events.length} событий`)
        
        // Подробная информация о событиях
        const eventDetails = events.map(event => ({
          id: event.id,
          summary: event.summary,
          description: event.description,
          start: event.start,
          end: event.end,
          status: event.status,
          visibility: event.visibility,
          creator: event.creator,
          organizer: event.organizer
        }))
        
        calendarData.push({
          calendar: {
            id: cal.id,
            summary: cal.summary,
            primary: cal.primary,
            accessRole: cal.accessRole
          },
          eventsCount: events.length,
          events: eventDetails
        })
        
      } catch (error) {
        console.error(`🔍 Debug: ошибка получения событий из календаря "${cal.summary}":`, error)
        calendarData.push({
          calendar: {
            id: cal.id,
            summary: cal.summary,
            primary: cal.primary,
            accessRole: cal.accessRole
          },
          error: error instanceof Error ? error.message : 'Неизвестная ошибка',
          eventsCount: 0,
          events: []
        })
      }
    }

    return NextResponse.json({
      success: true,
      user: session.user.email,
      timeRange: {
        from: timeMin.toISOString(),
        to: timeMax.toISOString()
      },
      calendarsFound: calendars.length,
      calendars: calendarData
    })
    
  } catch (error) {
    console.error('🔍 Debug: ошибка получения сырых данных календаря:', error)
    return NextResponse.json({ 
      error: 'Ошибка получения сырых данных календаря',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 })
  }
} 