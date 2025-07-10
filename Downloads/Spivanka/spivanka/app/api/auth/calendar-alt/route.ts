import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.redirect(new URL('/api/auth/signin', request.url))
    }

    // Перенаправляем на обычную авторизацию Google, но с расширенными scope
    const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    googleAuthUrl.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID!)
    googleAuthUrl.searchParams.set('redirect_uri', `${process.env.NEXTAUTH_URL}/api/auth/calendar-alt/callback`)
    googleAuthUrl.searchParams.set('response_type', 'code')
    googleAuthUrl.searchParams.set('scope', 'openid email profile https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/contacts.readonly')
    googleAuthUrl.searchParams.set('access_type', 'offline')
    googleAuthUrl.searchParams.set('prompt', 'consent')
    googleAuthUrl.searchParams.set('state', `calendar_${session.user.email}`) // Добавляем префикс для идентификации

    console.log('🔐 Перенаправление на запрос разрешений календаря и контактов')
    return NextResponse.redirect(googleAuthUrl.toString())

  } catch (error) {
    console.error('❌ Ошибка запроса разрешений календаря:', error)
    return NextResponse.redirect(new URL('/create', request.url))
  }
} 