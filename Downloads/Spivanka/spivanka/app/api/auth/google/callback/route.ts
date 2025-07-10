import { NextRequest, NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    
    if (!code) {
      return NextResponse.redirect(new URL('/auth/error?error=missing_code', request.url))
    }

    // Здесь должна быть логика обмена кода на токен и получения данных пользователя
    // Это делается через NextAuth, поэтому мы просто перенаправляем на проверку согласий
    
    // Перенаправляем на страницу проверки согласий
    return NextResponse.redirect(new URL('/api/auth/check-consents', request.url))

  } catch (error) {
    console.error('❌ Помилка обробки Google callback:', error)
    return NextResponse.redirect(new URL('/auth/error?error=callback_error', request.url))
  }
} 