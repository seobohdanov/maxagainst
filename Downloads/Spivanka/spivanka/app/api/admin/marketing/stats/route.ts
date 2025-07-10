import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import clientPromise from '@/lib/mongodb'

export async function GET(request: NextRequest) {
  try {
    // Проверяем авторизацию админа
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Не авторизований' },
        { status: 401 }
      )
    }

    // Проверяем, является ли пользователь админом
    if (session.user.email !== 'seobohdanov@gmail.com') {
      return NextResponse.json(
        { success: false, error: 'Доступ заборонено' },
        { status: 403 }
      )
    }

    const client = await clientPromise
    const db = client.db()
    const consentCollection = db.collection('user_consents')
    const emailLogCollection = db.collection('email_logs')

    // Получаем статистику согласий
    const totalConsents = await consentCollection.countDocuments()
    const activeConsents = await consentCollection.countDocuments({
      'marketingConsent.agreed': true
    })
    const unsubscribed = await consentCollection.countDocuments({
      'marketingConsent.agreed': false,
      'marketingConsent.withdrawnAt': { $exists: true }
    })

    // Получаем дату последней отправки
    const lastEmail = await emailLogCollection.findOne(
      { type: 'marketing' },
      { sort: { sentAt: -1 } }
    )

    const stats = {
      totalConsents,
      activeConsents,
      unsubscribed,
      lastEmailSent: lastEmail?.sentAt || null
    }

    return NextResponse.json({
      success: true,
      stats
    })

  } catch (error) {
    console.error('❌ Помилка отримання статистики маркетингу:', error)
    return NextResponse.json(
      { success: false, error: 'Помилка отримання статистики' },
      { status: 500 }
    )
  }
} 