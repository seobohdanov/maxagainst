import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

const LIQPAY_PUBLIC_KEY = process.env.LIQPAY_PUBLIC_KEY || ''
const LIQPAY_PRIVATE_KEY = process.env.LIQPAY_PRIVATE_KEY || ''

export async function POST(request: NextRequest) {
  try {
    const { amount, description, orderId } = await request.json()

    if (!LIQPAY_PUBLIC_KEY || !LIQPAY_PRIVATE_KEY) {
      return NextResponse.json(
        { error: 'LiqPay ключі не налаштовані' },
        { status: 500 }
      )
    }

    const data = {
      public_key: LIQPAY_PUBLIC_KEY,
      version: '3',
      action: 'pay',
      amount: amount,
      currency: 'UAH',
      description: description,
      order_id: orderId || `order_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      sandbox: process.env.NODE_ENV === 'development' ? 1 : 0,
      result_url: `${process.env.NEXTAUTH_URL}/payment/success`,
      server_url: `${process.env.NEXTAUTH_URL}/api/payment/liqpay/callback`
    }

    // Создаем подпись согласно документации LiqPay
    const dataString = Buffer.from(JSON.stringify(data)).toString('base64')
    const signature = crypto
      .createHmac('sha1', LIQPAY_PRIVATE_KEY)
      .update(dataString)
      .digest('base64')

    return NextResponse.json({
      success: true,
      data: dataString,
      signature: signature,
      publicKey: LIQPAY_PUBLIC_KEY,
      // Добавляем данные для встраивания формы
      embedData: {
        data: dataString,
        signature: signature,
        publicKey: LIQPAY_PUBLIC_KEY
      }
    })

  } catch (error) {
    console.error('LiqPay API error:', error)
    return NextResponse.json(
      { error: 'Помилка створення платежу' },
      { status: 500 }
    )
  }
} 