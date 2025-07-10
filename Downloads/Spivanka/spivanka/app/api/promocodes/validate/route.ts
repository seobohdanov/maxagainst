import { NextRequest, NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json()

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { error: 'Код промокода обязателен', valid: false },
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
        error: 'Промокод не найден',
        valid: false
      })
    }

    // Проверяем активность
    if (!promoCode.isActive) {
      return NextResponse.json({
        error: 'Промокод неактивен',
        valid: false
      })
    }

    // Проверяем даты действия
    const now = new Date()
    const validFrom = new Date(promoCode.validFrom)
    const validUntil = new Date(promoCode.validUntil)

    if (now < validFrom) {
      return NextResponse.json({
        error: 'Промокод еще не действует',
        valid: false
      })
    }

    if (now > validUntil) {
      return NextResponse.json({
        error: 'Срок действия промокода истек',
        valid: false
      })
    }

    // Проверяем лимит использований
    if (promoCode.usageLimit > 0 && promoCode.usageCount >= promoCode.usageLimit) {
      return NextResponse.json({
        error: 'Лимит использований промокода исчерпан',
        valid: false
      })
    }

    // Промокод валиден
    return NextResponse.json({
      valid: true,
      discount: promoCode.discount,
      description: promoCode.description,
      code: promoCode.code
    })

  } catch (error) {
    console.error('Ошибка валидации промокода:', error)
    return NextResponse.json(
      { error: 'Ошибка валидации промокода', valid: false },
      { status: 500 }
    )
  }
} 