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

    console.log('🔍 Debug: начинаю анализ календарных событий для:', session.user.email)

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
      console.log('🔄 Обновляю токены календаря в cache debug')
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
    timeMax.setFullYear(timeMax.getFullYear() + 1)

    // Получаем список всех календарей
    const calendarsResponse = await calendar.calendarList.list()
    const calendars = calendarsResponse.data.items || []
    
    console.log('🔍 Debug: найдено календарей:', calendars.length)

    // Попробуем также получить дни рождения контактов
    let contactBirthdayEvents: any[] = []
    try {
      console.log('🔍 Debug: пытаюсь получить дни рождения контактов...')
      const contactBirthdaysResponse = await calendar.events.list({
        calendarId: '#contacts@group.v.calendar.google.com',
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 250
      })
      
      contactBirthdayEvents = contactBirthdaysResponse.data.items || []
      console.log('🔍 Debug: найдено дней рождения контактов:', contactBirthdayEvents.length)
      
      if (contactBirthdayEvents.length > 0) {
        contactBirthdayEvents.forEach((event: any) => {
          event.calendarName = 'Дни рождения контактов'
          event.calendarId = '#contacts@group.v.calendar.google.com'
        })
      }
    } catch (error) {
      console.log('🔍 Debug: календарь дней рождения контактов недоступен:', error)
    }

    // Получаем события из всех календарей
    const allEvents: any[] = [...contactBirthdayEvents] // Начинаем с дней рождения контактов
    
    for (const cal of calendars) {
      try {
        const response = await calendar.events.list({
          calendarId: cal.id || 'primary',
          timeMin: timeMin.toISOString(),
          timeMax: timeMax.toISOString(),
          singleEvents: true,
          orderBy: 'startTime',
          maxResults: 250
        })
        
        const events = response.data.items || []
        events.forEach((event: any) => {
          event.calendarName = cal.summary || 'Основной календарь'
          event.calendarId = cal.id || 'primary'
        })
        
        allEvents.push(...events)
      } catch (error) {
        console.error(`❌ Ошибка получения событий из календаря ${cal.summary}:`, error)
      }
    }

    console.log('🔍 Debug: всего событий получено:', allEvents.length)

    // Анализируем каждое событие
    const analysis = allEvents.map((event: any) => {
      const summary = (event.summary || '').toLowerCase()
      const description = (event.description || '').toLowerCase()
      
      // Проверяем на дни рождения
      const isBirthday = (
        summary.includes('день рождения') ||
        summary.includes('день народження') ||
        summary.includes('днем народження') ||
        summary.includes('birthday') ||
        summary.includes('др ') ||
        summary.includes('др.') ||
        description.includes('день рождения') ||
        description.includes('день народження') ||
        description.includes('birthday')
      )
      
      // Проверяем на праздники
      const isHoliday = (
        summary.includes('день') ||
        summary.includes('новый год') ||
        summary.includes('новий рік') ||
        summary.includes('рождество') ||
        summary.includes('різдво') ||
        summary.includes('пасхальное') ||
        summary.includes('троица') ||
        summary.includes('первое мая') ||
        summary.includes('международный') ||
        summary.includes('святого') ||
        summary.includes('православный')
      )
      
      // Исключения
      const isExcluded = (
        summary.includes('перенесенный выходной') ||
        summary.includes('летнее время') ||
        summary.includes('зимнее время')
      )
      
      const isRelevant = (isBirthday || isHoliday) && !isExcluded
      
      // Пытаемся извлечь имя для дней рождения
      let extractedName = ''
      if (isBirthday) {
        const originalSummary = event.summary || ''
        
        // Специальная обработка для календаря контактов Google
        if (event.calendarId === '#contacts@group.v.calendar.google.com') {
          // В календаре контактов события обычно имеют формат "Имя Фамилия"
          extractedName = originalSummary.trim()
        } else {
          // Паттерн 1: "Имя – день рождения"
          let nameMatch = originalSummary.match(/^(.+?)\s*[–-]\s*/)
          if (nameMatch) {
            extractedName = nameMatch[1].trim()
          }
          
          // Паттерн 2: "День рождения Имени"
          if (!extractedName) {
            nameMatch = originalSummary.match(/(?:день рождения|день народження|birthday)\s+(.+?)$/i)
            if (nameMatch) {
              extractedName = nameMatch[1].trim()
            }
          }
          
          // Паттерн 4: Имя в начале
          if (!extractedName) {
            const words = originalSummary.split(' ')
            if (words.length >= 2) {
              const restOfTitle = words.slice(1).join(' ').toLowerCase()
              if (restOfTitle.includes('день') || restOfTitle.includes('birthday') || restOfTitle.includes('др')) {
                extractedName = words[0].trim()
              }
            }
          }
        }
      }
      
      return {
        id: event.id,
        summary: event.summary,
        description: event.description,
        calendarName: event.calendarName,
        date: event.start?.date || event.start?.dateTime,
        isBirthday,
        isHoliday,
        isExcluded,
        isRelevant,
        extractedName: extractedName || null
      }
    })

    // Группируем результаты
    const relevant = analysis.filter(e => e.isRelevant)
    const birthdays = relevant.filter(e => e.isBirthday)
    const holidays = relevant.filter(e => e.isHoliday && !e.isBirthday)
    const birthdaysWithNames = birthdays.filter(e => e.extractedName)
    const birthdaysWithoutNames = birthdays.filter(e => !e.extractedName)
    const contactBirthdays = birthdays.filter(e => e.calendarName === 'Дни рождения контактов')

    return NextResponse.json({
      success: true,
      summary: {
        totalEvents: allEvents.length,
        contactBirthdayEvents: contactBirthdayEvents.length,
        relevantEvents: relevant.length,
        birthdays: birthdays.length,
        holidays: holidays.length,
        birthdaysWithNames: birthdaysWithNames.length,
        birthdaysWithoutNames: birthdaysWithoutNames.length,
        contactBirthdays: contactBirthdays.length
      },
      details: {
        allBirthdays: birthdays,
        contactBirthdays,
        birthdaysWithNames,
        birthdaysWithoutNames,
        holidays: holidays.slice(0, 10), // Показываем только первые 10 праздников
        allRelevant: relevant
      }
    })
    
  } catch (error) {
    console.error('❌ Ошибка debug анализа календарных событий:', error)
    return NextResponse.json({ 
      error: 'Ошибка debug анализа календарных событий',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 })
  }
} 