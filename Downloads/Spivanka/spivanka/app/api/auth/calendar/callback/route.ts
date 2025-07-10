import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import clientPromise from '@/lib/mongodb'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state') // Это email пользователя
    const error = searchParams.get('error')

    if (error) {
      console.error('❌ Ошибка авторизации календаря:', error)
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?calendar_error=${encodeURIComponent(error)}`)
    }

    if (!code || !state) {
      console.error('❌ Отсутствует код авторизации или state')
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?calendar_error=missing_code`)
    }

    console.log('📅 Обрабатываю callback авторизации календаря для:', state)

    // Создаем OAuth2 клиент
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/calendar/callback`
    console.log('📅 Callback redirect URI:', redirectUri)
    
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirectUri
    )

    // Обмениваем код на токены
    const { tokens } = await oauth2Client.getToken(code)
    
    console.log('📅 Получены токены календаря:', {
      access_token: tokens.access_token ? 'присутствует' : 'отсутствует',
      refresh_token: tokens.refresh_token ? 'присутствует' : 'отсутствует',
      expires_at: tokens.expiry_date
    })

    // Сохраняем токены в базе данных
    const client = await clientPromise
    const db = client.db('spivanka')
    const collection = db.collection('calendar_tokens')

    const calendarTokens = {
      userEmail: state,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      scope: tokens.scope || 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/contacts.readonly',
      tokenType: tokens.token_type || 'Bearer',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    // Обновляем или создаем запись токенов
    await collection.replaceOne(
      { userEmail: state },
      calendarTokens,
      { upsert: true }
    )

    console.log('✅ Токены календаря сохранены в базе данных')

    // Запускаем автоматическую синхронизацию календаря
    try {
      console.log('📅 Запускаю автоматическую синхронизацию календаря для:', state)
      
      // Создаем календарный клиент с новыми токенами
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
      
      // Получаем список календарей
      const calendarsResponse = await calendar.calendarList.list()
      const calendars = calendarsResponse.data.items || []
      
      console.log('📅 Найдено календарей для синхронизации:', calendars.length)
      
      // Устанавливаем временные рамки: от сегодня до +1 год
      const timeMin = new Date()
      const timeMax = new Date()
      timeMax.setFullYear(timeMax.getFullYear() + 1)
      
      console.log('📅 Синхронизация событий с', timeMin.toISOString(), 'до', timeMax.toISOString())
      
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
            maxResults: 250
          })
          
          const calendarEvents = response.data.items || []
          console.log(`📅 Из календаря "${cal.summary}" получено событий: ${calendarEvents.length}`)
          
          allEvents.push(...calendarEvents)
        } catch (error) {
          console.error(`❌ Ошибка получения событий из календаря ${cal.summary}:`, error)
        }
      }
      
      console.log('📅 Всего событий синхронизировано:', allEvents.length)
      
      // Вызываем полную синхронизацию через API кэша
      try {
        console.log('📅 Запускаю полную синхронизацию через API кэша...')
        const cacheResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/calendar/cache`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          }
        })
        
        if (cacheResponse.ok) {
          const cacheData = await cacheResponse.json()
          console.log('✅ Полная синхронизация завершена:', cacheData.eventsCount, 'событий кэшировано')
        } else {
          console.error('❌ Ошибка полной синхронизации:', cacheResponse.status)
        }
      } catch (cacheError) {
        console.error('❌ Ошибка вызова API кэша:', cacheError)
      }
      
      console.log('✅ Автоматическая синхронизация календаря завершена')
      
    } catch (syncError) {
      console.error('⚠️ Ошибка автоматической синхронизации календаря:', syncError)
      // Не прерываем процесс, если синхронизация не удалась
    }

    // Перенаправляем обратно на dashboard с успешным статусом и активной вкладкой календаря
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?calendar_connected=true&activeTab=calendar`)
    
  } catch (error) {
    console.error('❌ Ошибка callback авторизации календаря:', error)
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?calendar_error=${encodeURIComponent('callback_error')}`)
  }
} 