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

    // Получаем все промокоды
    const promoCodes = await db.collection('promocodes')
      .find({})
      .sort({ createdAt: -1 })
      .toArray()

    return NextResponse.json(promoCodes)

  } catch (error) {
    console.error('Ошибка получения промокодов:', error)
    return NextResponse.json(
      { error: 'Ошибка получения промокодов' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Проверяем авторизацию админа
    const session = await getServerSession(authOptions)
    if (!session?.user?.email || session.user.email !== 'seobohdanov@gmail.com') {
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 })
    }

    const promoData = await request.json()
    const client = await clientPromise
    const db = client.db()

    // Проверяем, существует ли уже промокод с таким кодом
    const existingPromo = await db.collection('promocodes').findOne({
      code: promoData.code.toUpperCase()
    })

    if (existingPromo) {
      return NextResponse.json(
        { error: 'Промокод с таким кодом уже существует' },
        { status: 400 }
      )
    }

    // Создаем новый промокод
    const newPromoCode = {
      code: promoData.code.toUpperCase(),
      discount: promoData.discount,
      description: promoData.description || '',
      isActive: promoData.isActive ?? true,
      usageLimit: promoData.usageLimit || 0,
      usageCount: 0,
      validFrom: new Date(promoData.validFrom),
      validUntil: new Date(promoData.validUntil),
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const result = await db.collection('promocodes').insertOne(newPromoCode)
    
    console.log('✅ Промокод создан:', newPromoCode.code)
    
    return NextResponse.json({ 
      success: true, 
      id: result.insertedId,
      promo: newPromoCode 
    })

  } catch (error) {
    console.error('Ошибка создания промокода:', error)
    return NextResponse.json(
      { error: 'Ошибка создания промокода' },
      { status: 500 }
    )
  }
} 