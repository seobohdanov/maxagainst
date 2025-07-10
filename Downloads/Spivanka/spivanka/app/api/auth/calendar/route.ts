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

    console.log('📅 Начинаю авторизацию календаря для:', session.user.email)

    // Создаем OAuth2 клиент
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/calendar/callback`
    console.log('📅 Redirect URI:', redirectUri)
    
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirectUri
    )

    // Генерируем URL для авторизации с календарными скоупами
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: [
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/contacts.readonly'
      ],
      state: session.user.email // Передаем email пользователя в state
    })

    console.log('📅 Перенаправляю на авторизацию календаря:', authUrl)

    return NextResponse.redirect(authUrl)
    
  } catch (error) {
    console.error('❌ Ошибка авторизации календаря:', error)
    return NextResponse.json({ 
      error: 'Ошибка авторизации календаря',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 })
  }
} 