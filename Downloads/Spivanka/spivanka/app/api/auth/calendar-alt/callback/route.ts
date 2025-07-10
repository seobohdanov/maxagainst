import { NextRequest, NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state') // email пользователя с префиксом calendar_
    const error = searchParams.get('error')

    if (error) {
      console.log('❌ Пользователь отклонил запрос разрешений календаря')
      return NextResponse.redirect(new URL('/create', request.url))
    }

    if (!code || !state) {
      console.error('❌ Отсутствует code или state в callback')
      return NextResponse.redirect(new URL('/create', request.url))
    }

    // Извлекаем email из state (убираем префикс calendar_)
    const email = state.replace('calendar_', '')

    // Обмениваем код на токены
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/calendar-alt/callback`,
      }),
    })

    const tokens = await tokenResponse.json()

    if (!tokenResponse.ok) {
      console.error('❌ Ошибка получения токенов:', tokens)
      return NextResponse.redirect(new URL('/create', request.url))
    }

    // Сохраняем токены в базу данных
    const client = await clientPromise
    const db = client.db()
    const tokensCollection = db.collection('user_tokens')

    await tokensCollection.updateOne(
      { email: email.toLowerCase() },
      {
        $set: {
          email: email.toLowerCase(),
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
          calendarAccess: true,
          scope: tokens.scope,
          updatedAt: new Date()
        }
      },
      { upsert: true }
    )

    console.log('✅ Токены календаря и контактов сохранены для:', email)

    // Запускаем автоматическую синхронизацию календаря
    try {
      console.log('📅 Запускаю автоматическую синхронизацию календаря для нового пользователя:', email)
      
      // Создаем OAuth2 клиент с новыми токенами
      const { google } = await import('googleapis')
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${process.env.NEXTAUTH_URL}/api/auth/calendar-alt/callback`
      )
      
      oauth2Client.setCredentials({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token
      })
      
      // Создаем календарный клиент
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
        console.log('📅 Запускаю полную синхронизацию через API кэша для нового пользователя...')
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
      
      console.log('✅ Автоматическая синхронизация календаря завершена для нового пользователя')
      
    } catch (syncError) {
      console.error('⚠️ Ошибка автоматической синхронизации календаря:', syncError)
      // Не прерываем процесс, если синхронизация не удалась
    }

    // Перенаправляем на страницу создания
    return NextResponse.redirect(new URL('/create', request.url))

  } catch (error) {
    console.error('❌ Ошибка обработки callback календаря:', error)
    return NextResponse.redirect(new URL('/create', request.url))
  }
} 