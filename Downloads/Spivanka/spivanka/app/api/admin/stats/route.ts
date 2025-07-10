import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import clientPromise from '@/lib/mongodb'

export async function GET(request: NextRequest) {
  try {
    // Проверяем авторизацию админа
    const session = await getServerSession(authOptions)
    if (!session?.user?.email || session.user.email !== 'seobohdanov@gmail.com') {
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 })
    }

    const client = await clientPromise
    const db = client.db()

    // Получаем статистику
    const [
      totalUsers,
      totalGreetings,
      totalPayments,
      recentPayments,
      publicExamples,
      totalPromoCodes,
      activePromoCodes,
      promoUsageStats,
      totalConsents,
      termsConsents,
      marketingConsents
    ] = await Promise.all([
      // Общее количество пользователей (уникальные email)
      db.collection('greetings').distinct('userEmail').then((emails: string[]) => emails.length),
      
      // Общее количество приветствий
      db.collection('greetings').countDocuments(),
      
      // Общее количество успешных платежей
      db.collection('payments').countDocuments({ status: 'success' }),
      
      // Последние 10 платежей
      db.collection('payments')
        .find({ status: 'success' })
        .sort({ createdAt: -1 })
        .limit(10)
        .toArray(),
      
      // Публичные примеры
      db.collection('greetings')
        .find({ 
          $or: [
            { allowSharing: true },
            { makePublic: true }
          ],
          status: 'SUCCESS',
          musicUrl: { $exists: true, $ne: null }
        })
        .sort({ createdAt: -1 })
        .limit(20)
        .toArray(),
      
      // Общее количество промокодов
      db.collection('promocodes').countDocuments(),
      
      // Количество активных промокодов
      db.collection('promocodes').countDocuments({ 
        isActive: true,
        validUntil: { $gte: new Date() }
      }),
      
      // Статистика использования промокодов
      db.collection('promo_usage')
        .aggregate([
          {
            $group: {
              _id: '$promoCode',
              usageCount: { $sum: 1 },
              totalDiscount: { $sum: '$discount' }
            }
          },
          { $sort: { usageCount: -1 } },
          { $limit: 5 }
        ])
        .toArray(),
      
      // Общее количество согласий
      db.collection('user_consents').countDocuments(),
      
      // Количество согласий с условиями
      db.collection('user_consents').countDocuments({ 'termsConsent.agreed': true }),
      
      // Количество маркетинговых согласий
      db.collection('user_consents').countDocuments({ 'marketingConsent.agreed': true })
    ])

    // Получаем все платежи для подсчета общего дохода
    const allPayments = await db.collection('payments')
      .find({ status: 'success' })
      .toArray()
    
    const actualTotalRevenue = allPayments.reduce((sum: number, payment: any) => {
      return sum + (payment.amount || 0)
    }, 0)

    const stats = {
      totalUsers,
      totalGreetings,
      totalPayments,
      totalRevenue: actualTotalRevenue,
      recentPayments: recentPayments.map((payment: any) => ({
        userEmail: payment.userEmail,
        amount: payment.amount,
        createdAt: payment.createdAt,
        status: payment.status,
        plan: payment.plan
      })),
      publicExamples: publicExamples.map((example: any) => ({
        id: example._id.toString(),
        recipientName: example.recipientName,
        occasion: example.occasion,
        relationship: example.relationship,
        createdAt: example.createdAt,
        musicUrl: example.musicUrl,
        coverUrl: example.coverUrl,
        userEmail: example.userEmail
      })),
      totalPromoCodes,
      activePromoCodes,
      promoUsageStats: promoUsageStats.map((stat: any) => ({
        promoCode: stat._id,
        usageCount: stat.usageCount,
        totalDiscount: stat.totalDiscount
      })),
      totalConsents,
      termsConsents,
      marketingConsents
    }

    return NextResponse.json(stats)

  } catch (error) {
    console.error('Ошибка получения статистики админки:', error)
    return NextResponse.json(
      { error: 'Ошибка получения статистики' },
      { status: 500 }
    )
  }
} 