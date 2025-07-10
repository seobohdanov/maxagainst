import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import clientPromise from '@/lib/mongodb'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.redirect(new URL('/api/auth/signin', request.url))
    }

    const client = await clientPromise
    const db = client.db()
    const consentCollection = db.collection('user_consents')

    // Ищем существующие согласия
    const existingConsent = await consentCollection.findOne({ 
      email: session.user.email.toLowerCase() 
    })

    if (existingConsent) {
      // Если есть согласия, проверяем согласие на доступ к календарю и контактам
      if (existingConsent.calendarContactsConsent?.agreed) {
        // Если дано согласие на доступ к календарю и контактам, 
        // перенаправляем на запрос дополнительных разрешений
        return NextResponse.redirect(new URL('/api/auth/calendar-alt', request.url))
      } else {
        // Если согласия на календарь нет, перенаправляем на форму согласий
        return NextResponse.redirect(new URL('/consent-form', request.url))
      }
    } else {
      // Если согласий нет, перенаправляем на форму согласий
      return NextResponse.redirect(new URL('/consent-form', request.url))
    }

  } catch (error) {
    console.error('❌ Ошибка проверки согласий:', error)
    return NextResponse.redirect(new URL('/consent-form', request.url))
  }
} 