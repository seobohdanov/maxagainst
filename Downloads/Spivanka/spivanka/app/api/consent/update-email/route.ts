import { NextRequest, NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, sessionId } = body

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email обов\'язковий' },
        { status: 400 }
      )
    }

    const client = await clientPromise
    const db = client.db()
    const consentCollection = db.collection('user_consents')

    // Ищем запись согласия по sessionId или создаем новую
    let consentRecord = null
    
    if (sessionId) {
      consentRecord = await consentCollection.findOne({ sessionId })
    }
    
    if (consentRecord) {
      // Обновляем существующую запись
      await consentCollection.updateOne(
        { sessionId },
        { 
          $set: {
            email: email.toLowerCase(),
            updatedAt: new Date()
          }
        }
      )
      console.log('✅ Оновлено email в згоді для sessionId:', sessionId)
    } else {
      // Создаем новую запись с email
      const newConsent = {
        email: email.toLowerCase(),
        sessionId: sessionId || null,
        termsConsent: {
          agreed: true,
          date: new Date(),
          ipAddress: 'unknown',
          userAgent: 'unknown'
        },
        marketingConsent: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      await consentCollection.insertOne(newConsent)
      console.log('✅ Створено нову згоду з email:', email)
    }

    return NextResponse.json({
      success: true,
      message: 'Email успішно оновлено'
    })

  } catch (error) {
    console.error('❌ Помилка оновлення email:', error)
    return NextResponse.json(
      { success: false, error: 'Помилка оновлення email' },
      { status: 500 }
    )
  }
} 