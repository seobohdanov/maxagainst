import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { google } from 'googleapis'
import clientPromise from '@/lib/mongodb'
import { analyzeBatchContacts } from '@/services/contactAnalysisService'

// Интерфейс для кэшированного события
interface CachedCalendarEvent {
  id: string
  summary: string
  description?: string
  start: any
  end: any
  type: 'birthday' | 'holiday' | 'custom'
  recipient?: string
  relationship?: string
  calendarName: string
  calendarId: string
  lastUpdated: Date
}

// Интерфейс для документа пользователя в базе данных
interface UserCalendarCache {
  userId: string
  userEmail: string
  events: CachedCalendarEvent[]
  lastSync: Date
  nextSync: Date
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    // Получаем токены календаря из отдельной коллекции
    const mongoClient = await clientPromise
    const database = mongoClient.db('spivanka')
    const tokensCollection = database.collection('calendar_tokens')
    
    const calendarTokens = await tokensCollection.findOne({ userEmail: session.user.email })
    
    if (!calendarTokens || !calendarTokens.accessToken) {
      return NextResponse.json({ 
        error: 'Календарь не подключен. Необходимо подключить Google Calendar.',
        needsCalendarAuth: true 
      }, { status: 401 })
    }

    const accessToken = calendarTokens.accessToken

    console.log('📅 Начинаю кэширование календарных событий для:', session.user.email)

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
      console.log('🔄 Обновляю токены календаря')
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
    
    // Принудительно обновляем токены перед использованием
    try {
      console.log('🔄 Принудительное обновление токенов календаря...')
      await auth.getAccessToken()
      console.log('✅ Токены календаря успешно обновлены')
    } catch (tokenError: any) {
      console.error('❌ Ошибка обновления токенов:', tokenError)
      
      if (tokenError.code === 400 && tokenError.message?.includes('invalid_grant')) {
        console.log('🔄 Токены устарели, требуется переавторизация')
        return NextResponse.json({ 
          error: 'Токены календаря устарели. Необходимо переавторизоваться.',
          needsReauth: true 
        }, { status: 401 })
      }
      
      return NextResponse.json({ 
        error: 'Ошибка обновления токенов календаря',
        details: tokenError.message || 'Неизвестная ошибка'
      }, { status: 500 })
    }
    
    const calendar = google.calendar({ version: 'v3', auth })

    // Устанавливаем временные рамки
    const currentTime = new Date()
    const startOfToday = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate()) // Начало сегодняшнего дня
    const timeMin = startOfToday.toISOString() // Начинаем с начала сегодняшнего дня
    const timeMinDate = startOfToday // Для сравнения дат
    
    const timeMaxBirthdays = new Date()
    timeMaxBirthdays.setFullYear(timeMaxBirthdays.getFullYear() + 1) // Дни рождения на следующий год
    
    const timeMaxHolidays = new Date()
    timeMaxHolidays.setMonth(11, 31) // Праздники до конца текущего года (31 декабря)
    timeMaxHolidays.setHours(23, 59, 59, 999)
    
    console.log('📅 Временные рамки:')
    console.log('  - Начало периода:', timeMin)
    console.log('  - Дни рождения: до', timeMaxBirthdays.toISOString())
    console.log('  - Праздники: до', timeMaxHolidays.toISOString())

    // Получаем список всех календарей
    let calendarsResponse
    try {
      calendarsResponse = await calendar.calendarList.list()
    } catch (error: any) {
      console.error('❌ Ошибка получения списка календарей:', error)
      
      // Проверяем, является ли ошибка связанной с токенами
      if (error.code === 400 && error.message?.includes('invalid_grant')) {
        console.log('🔄 Токены устарели, требуется переавторизация')
        return NextResponse.json({ 
          error: 'Токены календаря устарели. Необходимо переавторизоваться.',
          needsReauth: true 
        }, { status: 401 })
      }
      
      return NextResponse.json({ 
        error: 'Ошибка получения списка календарей',
        details: error.message || 'Неизвестная ошибка'
      }, { status: 500 })
    }
    
    const calendars = calendarsResponse.data.items || []
    console.log('📅 Найдено календарей:', calendars.length)

    // Добавляем календарь контактов в список для обработки в общем цикле
    try {
      console.log('📅 Добавляю календарь дней рождения контактов в список...')
      const contactsCalendar = {
        id: '#contacts@group.v.calendar.google.com',
        summary: 'Дни рождения контактов',
        primary: false,
        accessRole: 'reader'
      }
      calendars.push(contactsCalendar)
      console.log('📅 Календарь дней рождения контактов добавлен в список')
    } catch (error) {
      console.log('📅 Ошибка добавления календаря контактов:', error)
    }

    // Получаем события из всех календарей с разными временными рамками
    const allEvents: any[] = []
    
    for (const cal of calendars) {
      try {
        // Получаем все события до следующего года (максимальный диапазон)
        const response = await calendar.events.list({
          calendarId: cal.id || 'primary',
          timeMin: timeMin,
          timeMax: timeMaxBirthdays.toISOString(),
          singleEvents: true,
          orderBy: 'startTime',
          maxResults: 250
        })
        
        const calendarEvents = response.data.items || []
        console.log(`📅 Из календаря "${cal.summary}" получено событий: ${calendarEvents.length}`)
        
        // Добавляем метаданные к каждому событию
        calendarEvents.forEach((event: any) => {
          event.calendarName = cal.summary || 'Основной календарь'
          event.calendarId = cal.id || 'primary'
        })
        
        allEvents.push(...calendarEvents)
      } catch (error) {
        console.error(`❌ Ошибка получения событий из календаря ${cal.summary}:`, error)
      }
    }

    console.log('📅 Всего событий получено:', allEvents.length)
    
    // Фильтруем события, убирая прошедшие даты
    const currentTimeForFilter = new Date()
    const todayForFilter = new Date(currentTimeForFilter.getFullYear(), currentTimeForFilter.getMonth(), currentTimeForFilter.getDate()) // Только дата, без времени
    
    console.log('📅 Сегодняшняя дата для фильтрации:', todayForFilter.toISOString().split('T')[0])
    
    const filteredEvents = allEvents.filter(event => {
      let eventDate: Date
      
      if (event.start?.date) {
        // Для событий на весь день
        eventDate = new Date(event.start.date)
      } else if (event.start?.dateTime) {
        // Для событий с временем
        eventDate = new Date(event.start.dateTime)
      } else {
        // Если нет даты, исключаем событие
        return false
      }
      
      // Сравниваем только даты (без времени)
      const eventDateOnly = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate())
      const isInFuture = eventDateOnly >= todayForFilter
      
      if (!isInFuture) {
        console.log(`📅 Отфильтровано прошедшее событие: "${event.summary}" (${eventDateOnly.toISOString().split('T')[0]})`)
      }
      
      return isInFuture
    })
    
    console.log('📅 Событий после фильтрации прошедших дат:', filteredEvents.length)
    
    // Логируем примеры событий для диагностики
    if (filteredEvents.length > 0) {
      console.log('📋 Примеры актуальных событий:')
      filteredEvents.slice(0, 5).forEach((event, index) => {
        const eventDate = event.start?.date ? new Date(event.start.date) : new Date(event.start?.dateTime)
        const eventDateOnly = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate())
        console.log(`  ${index + 1}. "${event.summary}" (${eventDateOnly.toISOString().split('T')[0]}) - ${event.calendarName}`)
      })
    }
    
    // Логируем отфильтрованные события для диагностики
    const filteredOutEvents = allEvents.filter(event => {
      let eventDate: Date
      if (event.start?.date) {
        eventDate = new Date(event.start.date)
      } else if (event.start?.dateTime) {
        eventDate = new Date(event.start.dateTime)
      } else {
        return false
      }
      const eventDateOnly = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate())
      return eventDateOnly < todayForFilter
    })
    
    if (filteredOutEvents.length > 0) {
      console.log('📅 Отфильтровано прошедших событий:', filteredOutEvents.length)
      filteredOutEvents.slice(0, 3).forEach((event, index) => {
        const eventDate = event.start?.date ? new Date(event.start.date) : new Date(event.start?.dateTime)
        const eventDateOnly = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate())
        console.log(`  ${index + 1}. "${event.summary}" (${eventDateOnly.toISOString().split('T')[0]}) - ${event.calendarName}`)
      })
    }

    // Удаляем дубликаты по ID события
    const uniqueEvents = filteredEvents.filter((event, index, self) => 
      index === self.findIndex(e => e.id === event.id)
    )
    
    console.log('📅 Уникальных событий после дедупликации:', uniqueEvents.length)
    if (filteredEvents.length !== uniqueEvents.length) {
      console.log('⚠️ Обнаружено и удалено дубликатов:', filteredEvents.length - uniqueEvents.length)
    }

    // Фильтруем только дни рождения и праздники с учетом временных рамок
    const relevantEvents = uniqueEvents.filter((event: any) => {
      const summary = (event.summary || '').toLowerCase()
      const description = (event.description || '').toLowerCase()
      
      // Определяем дату события
      const eventDate = new Date(event.start?.date || event.start?.dateTime || '')
      
      console.log(`📅 Анализирую событие: "${event.summary}" (${eventDate.toISOString()})`)
      
      // Проверяем тип события
      const isBirthday = (
        summary.includes('день рождения') ||
        summary.includes('день народження') ||
        summary.includes('днем народження') ||
        summary.includes('birthday') ||
        summary.includes('др ') ||
        summary.includes('др.') ||
        description.includes('день рождения') ||
        description.includes('день народження') ||
        description.includes('birthday') ||
        // События из календаря контактов Google обычно не содержат ключевых слов
        event.calendarId === '#contacts@group.v.calendar.google.com'
      )
      
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
      ) && !isBirthday // Праздники не должны быть днями рождения
      
      // Исключаем технические события
      const isExcluded = (
        summary.includes('перенесенный выходной') ||
        summary.includes('летнее время') ||
        summary.includes('зимнее время')
      )
      
      if (isExcluded) {
        console.log(`📅 Исключено техническое событие: ${summary}`)
        return false
      }
      
      // Дни рождения - от сегодня до следующего года
      if (isBirthday) {
        const isWithinBirthdayRange = eventDate >= timeMinDate && eventDate <= timeMaxBirthdays
        console.log(`📅 День рождения "${summary}": ${isWithinBirthdayRange ? 'в диапазоне' : 'вне диапазона'}`)
        if (!isWithinBirthdayRange) {
          console.log(`📅 Исключен день рождения вне диапазона: ${summary} (${eventDate.toISOString()})`)
        }
        return isWithinBirthdayRange
      }
      
      // Праздники - от сегодня до конца текущего года
      if (isHoliday) {
        const isWithinHolidayRange = eventDate >= timeMinDate && eventDate <= timeMaxHolidays
        console.log(`📅 Праздник "${summary}": ${isWithinHolidayRange ? 'в диапазоне' : 'вне диапазона'}`)
        if (!isWithinHolidayRange) {
          console.log(`📅 Исключен праздник вне диапазона: ${summary} (${eventDate.toISOString()})`)
        }
        return isWithinHolidayRange
      }
      
      console.log(`📅 Событие "${summary}" не подходит под критерии`)
      return false
    })

    console.log('📅 Релевантных событий:', relevantEvents.length)

    // Сначала извлекаем все имена для пакетного анализа
    const extractedNames: string[] = []
    const eventNameMap: Record<string, any> = {} // Мапа событие -> извлеченное имя
    
    for (const event of relevantEvents) {
      const summary = event.summary || ''
      const summaryLower = summary.toLowerCase()
      
      // Определяем тип события
      const isBirthday = (
        summaryLower.includes('день рождения') ||
        summaryLower.includes('день народження') ||
        summaryLower.includes('днем народження') ||
        summaryLower.includes('birthday') ||
        summaryLower.includes('др ') ||
        summaryLower.includes('др.')
      )
      
      if (isBirthday) {
        let extractedName = ''
        
        // Специальная обработка для календаря контактов Google
        if (event.calendarId === '#contacts@group.v.calendar.google.com') {
          // В календаре контактов события обычно имеют формат "Имя Фамилия"
          extractedName = summary.trim()
          console.log('📝 Календарь контактов - Извлечено имя:', { summary, extractedName })
        } else {
          // Обычная логика для других календарей
          // Паттерн 1: "Имя – день рождения" или "Имя - день рождения" - берем полное название
          let nameMatch = summary.match(/^(.+?)\s*[–-]\s*/)
          if (nameMatch) {
            extractedName = summary.trim() // Берем полное название для последующей очистки в сервисе
            console.log('📝 Паттерн 1 - Извлечено полное название:', { summary, extractedName })
          }
          
          // Паттерн 2: "День рождения Имени" или "День народження Імені"
          if (!extractedName) {
            nameMatch = summary.match(/(?:день рождения|день народження|birthday)\s+(.+?)$/i)
            if (nameMatch) {
              extractedName = nameMatch[1].trim()
              console.log('📝 Паттерн 2 - Извлечено имя:', { summary, extractedName })
            }
          }
          
          // Паттерн 3: "З днем народження!" - пропускаем, нет имени
          if (!extractedName && (summary.toLowerCase().includes('з днем') || summary.toLowerCase().includes('с днем'))) {
            console.log('📝 Паттерн 3 - Общее поздравление без имени:', summary)
            // Для таких событий не извлекаем имя
          }
          
          // Паттерн 4: Просто имя в начале, если есть ключевые слова
          if (!extractedName) {
            // Ищем имя в начале строки до первого пробела, если дальше есть ключевые слова
            const words = summary.split(' ')
            if (words.length >= 2) {
              const restOfTitle = words.slice(1).join(' ').toLowerCase()
              if (restOfTitle.includes('день') || restOfTitle.includes('birthday') || restOfTitle.includes('др')) {
                extractedName = words[0].trim()
                console.log('📝 Паттерн 4 - Извлечено имя из начала:', { summary, extractedName })
              }
            }
          }
        }
        
        if (extractedName) {
          extractedNames.push(extractedName)
          eventNameMap[event.id] = extractedName
          console.log('📝 Добавлено имя для анализа:', { eventId: event.id, extractedName })
        } else {
          console.log('⚠️ Не удалось извлечь имя из события:', summary)
        }
      }
    }

    // Выполняем пакетный анализ всех извлеченных имен
    let analysisResults: Record<string, any> = {}
    if (extractedNames.length > 0) {
      console.log(`🤖 Начинаю пакетный анализ ${extractedNames.length} имен...`)
      try {
        analysisResults = await analyzeBatchContacts(extractedNames)
        console.log('✅ Пакетный анализ завершен успешно')
      } catch (error) {
        console.error('❌ Ошибка пакетного анализа:', error)
        // Fallback: создаем результаты без обработки
        extractedNames.forEach(name => {
          analysisResults[name] = { isRelative: false, recipientName: name }
        })
      }
    }

    // Обрабатываем каждое событие
    const processedEvents: CachedCalendarEvent[] = []
    
    for (const event of relevantEvents) {
      const summary = event.summary || ''
      const summaryLower = summary.toLowerCase()
      const description = event.description || ''
      
      let type: 'birthday' | 'holiday' | 'custom' = 'holiday'
      let recipient = ''
      let relationship = ''
      
      // Определяем тип события
      const isBirthdayEvent = (
        summaryLower.includes('день рождения') || 
        summaryLower.includes('день народження') || 
        summaryLower.includes('днем народження') ||
        summaryLower.includes('birthday') ||
        summaryLower.includes('др ') ||
        summaryLower.includes('др.') ||
        // События из календаря контактов Google
        event.calendarId === '#contacts@group.v.calendar.google.com'
      )
      
      if (isBirthdayEvent) {
        type = 'birthday'
        console.log(`📅 Обрабатываю день рождения: "${summary}" (календарь: ${event.calendarId})`)
        
        // Получаем результат анализа для этого события
        const extractedName = eventNameMap[event.id]
        if (extractedName && analysisResults[extractedName]) {
          const relationshipResult = analysisResults[extractedName]
          console.log('🤖 Результат анализа для события:', { eventId: event.id, extractedName, relationshipResult })
          
          if (relationshipResult.isRelative && relationshipResult.relationship) {
            relationship = relationshipResult.relationship
            recipient = '' // Для родственников имя не заполняем
            console.log('✅ Визначено родинний зв\'язок:', relationship)
          } else {
            recipient = relationshipResult.recipientName || extractedName
            console.log('✅ Обработано имя получателя:', recipient)
          }
        } else if (extractedName) {
          // Fallback если анализ не удался
          recipient = extractedName
          console.log('⚠️ Использую исходное имя без обработки:', extractedName)
        } else {
          console.log('⚠️ Событие без имени:', summary)
          // Для событий без имени создаем запись с заголовком как поводом
          recipient = ''
          relationship = ''
        }
      } else {
        console.log(`📅 Обрабатываю праздник: "${summary}"`)
      }
      
      const cachedEvent: CachedCalendarEvent = {
        id: event.id || '',
        summary: summary,
        description: description,
        start: event.start,
        end: event.end,
        type: type,
        recipient: recipient,
        relationship: relationship,
        calendarName: event.calendarName || '',
        calendarId: event.calendarId || '',
        lastUpdated: new Date()
      }
      
      processedEvents.push(cachedEvent)
    }

    // Сохраняем в базу данных
    const client = await clientPromise
    const db = client.db('spivanka')
    const collection = db.collection('calendar_cache')
    
    // Сначала удаляем старый кэш для пользователя
    await collection.deleteOne({ userEmail: session.user.email })
    console.log('🗑️ Старый кэш удален для пользователя:', session.user.email)
    
    const userCalendarCache: UserCalendarCache = {
      userId: session.user.email,
      userEmail: session.user.email,
      events: processedEvents,
      lastSync: new Date(),
      nextSync: new Date(Date.now() + 24 * 60 * 60 * 1000) // Следующая синхронизация через 24 часа
    }
    
    // Создаем новый кэш для пользователя
    await collection.insertOne(userCalendarCache)
    console.log('✅ Новый кэш создан для пользователя:', session.user.email)
    
    console.log('✅ Календарные события кэшированы в базе данных')
    
    return NextResponse.json({
      success: true,
      message: 'Календарные события успешно кэшированы',
      eventsCount: processedEvents.length,
      lastSync: userCalendarCache.lastSync,
      nextSync: userCalendarCache.nextSync
    })
    
  } catch (error) {
    console.error('❌ Ошибка кэширования календарных событий:', error)
    return NextResponse.json({ 
      error: 'Ошибка кэширования календарных событий',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 })
  }
}

// GET запрос для получения кэшированных событий
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const client = await clientPromise
    const db = client.db('spivanka')
    const collection = db.collection('calendar_cache')
    
    const userCache = await collection.findOne({ userEmail: session.user.email })
    
    if (!userCache) {
      return NextResponse.json({
        success: false,
        message: 'Кэш не найден, необходима синхронизация',
        events: []
      })
    }
    
    // Проверяем, не устарел ли кэш
    const now = new Date()
    const cacheExpired = now > userCache.nextSync
    
    if (cacheExpired) {
      return NextResponse.json({
        success: false,
        message: 'Кэш устарел, необходима синхронизация',
        events: userCache.events || [],
        lastSync: userCache.lastSync,
        expired: true
      })
    }
    
    return NextResponse.json({
      success: true,
      events: userCache.events || [],
      lastSync: userCache.lastSync,
      nextSync: userCache.nextSync
    })
    
  } catch (error) {
    console.error('❌ Ошибка получения кэшированных событий:', error)
    return NextResponse.json({ 
      error: 'Ошибка получения кэшированных событий',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 })
  }
} 