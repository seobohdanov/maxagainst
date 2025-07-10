import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import clientPromise from '@/lib/mongodb'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const { code, orderId } = await request.json()

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { error: 'Код промокода обязателен' },
        { status: 400 }
      )
    }

    const client = await clientPromise
    const db = client.db()

    // Ищем промокод
    const promoCode = await db.collection('promocodes').findOne({
      code: code.toUpperCase()
    })

    if (!promoCode) {
      return NextResponse.json({
        error: 'Промокод не найден'
      }, { status: 404 })
    }

    // Проверяем активность
    if (!promoCode.isActive) {
      return NextResponse.json({
        error: 'Промокод неактивен'
      }, { status: 400 })
    }

    // Проверяем даты действия
    const now = new Date()
    const validFrom = new Date(promoCode.validFrom)
    const validUntil = new Date(promoCode.validUntil)

    if (now < validFrom || now > validUntil) {
      return NextResponse.json({
        error: 'Промокод недействителен'
      }, { status: 400 })
    }

    // Проверяем лимит использований
    if (promoCode.usageLimit > 0 && promoCode.usageCount >= promoCode.usageLimit) {
      return NextResponse.json({
        error: 'Лимит использований промокода исчерпан'
      }, { status: 400 })
    }

    // Увеличиваем счетчик использований
    await db.collection('promocodes').updateOne(
      { _id: promoCode._id },
      { 
        $inc: { usageCount: 1 },
        $set: { updatedAt: new Date() }
      }
    )

    // Логируем использование промокода
    await db.collection('promo_usage').insertOne({
      promoId: promoCode._id,
      promoCode: promoCode.code,
      userEmail: session.user.email,
      orderId: orderId || null,
      discount: promoCode.discount,
      usedAt: new Date()
    })

    console.log(`✅ Промокод ${promoCode.code} использован пользователем ${session.user.email}`)

    return NextResponse.json({
      success: true,
      discount: promoCode.discount,
      description: promoCode.description
    })

  } catch (error) {
    console.error('Ошибка использования промокода:', error)
    return NextResponse.json(
      { error: 'Ошибка использования промокода' },
      { status: 500 }
    )
  }
} 