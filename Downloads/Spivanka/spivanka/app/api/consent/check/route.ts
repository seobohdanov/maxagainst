import { NextRequest, NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email обов\'язковий' },
        { status: 400 }
      )
    }

    const client = await clientPromise
    const db = client.db()
    const consentCollection = db.collection('user_consents')

    // Проверяем, есть ли согласия у пользователя
    const existingConsent = await consentCollection.findOne({
      email: email.toLowerCase()
    })

    return NextResponse.json({
      success: true,
      hasConsents: !!existingConsent,
      hasCalendarContactsConsent: existingConsent?.calendarContactsConsent?.agreed || false,
      consent: existingConsent
    })

  } catch (error) {
    console.error('❌ Помилка перевірки згод:', error)
    return NextResponse.json(
      { success: false, error: 'Помилка перевірки згод' },
      { status: 500 }
    )
  }
} 