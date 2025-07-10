import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

const FONDY_MERCHANT_ID = process.env.FONDY_MERCHANT_ID || '1555718'
const FONDY_SECRET_KEY = process.env.FONDY_SECRET_KEY || 'PYEsFydVce3sFvmX2s6KuYLyjonuQgFO'

export async function POST(request: NextRequest) {
  try {
    const { amount, description, orderId } = await request.json()

    if (!FONDY_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Fondy ключі не налаштовані' },
        { status: 500 }
      )
    }

    // Создаем данные для платежа
    const paymentData = {
      merchant_id: parseInt(FONDY_MERCHANT_ID),
      order_id: orderId || `order_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      order_desc: description || 'Музичне привітання',
      amount: amount * 100, // Fondy работает в копейках
      currency: 'UAH',
      lang: 'uk',
      sender_email: 'noreply@spivanka.com',
      response_url: `${process.env.NEXTAUTH_URL}/payment/success`,
      server_callback_url: `${process.env.NEXTAUTH_URL}/api/payment/fondy/callback`,
      version: '1.0.1'
    }

    // Создаем подпись для Fondy
    const signature = createFondySignature(paymentData, FONDY_SECRET_KEY)
    
    // Логируем для диагностики (только в разработке)
    if (process.env.NODE_ENV === 'development') {
      console.log('🔐 Fondy signature data:', {
        merchant_id: paymentData.merchant_id,
        order_id: paymentData.order_id,
        amount: paymentData.amount,
        currency: paymentData.currency,
        signature: signature
      })
    }

    return NextResponse.json({
      success: true,
      paymentData: {
        ...paymentData,
        signature: signature
      }
    })

  } catch (error) {
    console.error('Fondy API error:', error)
    return NextResponse.json(
      { error: 'Помилка створення платежу' },
      { status: 500 }
    )
  }
}

// Функция создания подписи для Fondy согласно официальной документации
function createFondySignature(data: any, secretKey: string): string {
  // Добавляем merchant_id если его нет
  const dataWithMerchant = { ...data, merchant_id: data.merchant_id }
  
  // Фильтруем пустые значения (убираем null, undefined, пустые строки)
  const filteredData = Object.fromEntries(
    Object.entries(dataWithMerchant).filter(([key, value]) => 
      value !== null && value !== undefined && value !== ''
    )
  )
  
  // Сортируем ключи в алфавитном порядке
  const sortedKeys = Object.keys(filteredData).sort()
  
  // Собираем значения в алфавитном порядке
  const values = sortedKeys.map(key => filteredData[key])
  
  // Добавляем секретный ключ в начало массива
  values.unshift(secretKey)
  
  // Соединяем все значения символом |
  const stringToSign = values.join('|')
  
  // Создаем SHA-1 хеш в нижнем регистре
  return crypto.createHash('sha1').update(stringToSign).digest('hex')
} 