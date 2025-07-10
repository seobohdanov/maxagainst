import { NextRequest, NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      email, 
      sessionId,
      termsConsent, 
      marketingConsent, 
      calendarContactsConsent,
      ipAddress, 
      userAgent 
    } = body

    // Валидация обязательных полей
    if (!termsConsent) {
      return NextResponse.json(
        { success: false, error: 'Згода з умовами обов\'язкова' },
        { status: 400 }
      )
    }

    const client = await clientPromise
    const db = client.db()
    const consentCollection = db.collection('user_consents')

    // Получаем IP адрес
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0] : 'unknown'

    // Создаем запись о согласии
    const consentData = {
      email: email ? email.toLowerCase() : null,
      sessionId: sessionId || null,
      termsConsent: {
        agreed: termsConsent,
        date: new Date(),
        ipAddress: ipAddress || ip,
        userAgent: userAgent || request.headers.get('user-agent') || 'unknown'
      },
      marketingConsent: marketingConsent ? {
        agreed: marketingConsent,
        date: new Date(),
        ipAddress: ipAddress || ip,
        userAgent: userAgent || request.headers.get('user-agent') || 'unknown'
      } : null,
      calendarContactsConsent: calendarContactsConsent ? {
        agreed: calendarContactsConsent,
        date: new Date(),
        ipAddress: ipAddress || ip,
        userAgent: userAgent || request.headers.get('user-agent') || 'unknown'
      } : null,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    // Если есть sessionId, ищем по нему, иначе создаем новую запись
    if (sessionId) {
      const existingConsent = await consentCollection.findOne({ sessionId })
      
      if (existingConsent) {
        // Обновляем существующую запись
        await consentCollection.updateOne(
          { sessionId },
          { 
            $set: {
              termsConsent: consentData.termsConsent,
              marketingConsent: consentData.marketingConsent,
              calendarContactsConsent: consentData.calendarContactsConsent,
              updatedAt: new Date()
            }
          }
        )
        console.log('✅ Оновлено згоду для sessionId:', sessionId)
      } else {
        // Создаем новую запись
        await consentCollection.insertOne(consentData)
        console.log('✅ Збережено нову згоду для sessionId:', sessionId)
      }
    } else {
      // Создаем новую запись без sessionId
      await consentCollection.insertOne(consentData)
      console.log('✅ Збережено нову згоду без sessionId')
    }

    return NextResponse.json({
      success: true,
      message: 'Згода успішно збережена'
    })

  } catch (error) {
    console.error('❌ Помилка збереження згоди:', error)
    return NextResponse.json(
      { success: false, error: 'Помилка збереження згоди' },
      { status: 500 }
    )
  }
} 