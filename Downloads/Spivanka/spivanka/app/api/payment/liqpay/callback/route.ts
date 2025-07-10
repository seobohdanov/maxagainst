import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import clientPromise from '@/lib/mongodb'

const LIQPAY_PRIVATE_KEY = process.env.LIQPAY_PRIVATE_KEY || ''

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const params = new URLSearchParams(body)
    
    const data = params.get('data')
    const signature = params.get('signature')
    
    if (!data || !signature) {
      return NextResponse.json({ error: 'Відсутні дані' }, { status: 400 })
    }

    // Проверяем подпись
    const expectedSignature = crypto
      .createHmac('sha1', LIQPAY_PRIVATE_KEY)
      .update(data)
      .digest('base64')

    if (signature !== expectedSignature) {
      return NextResponse.json({ error: 'Невірна підпис' }, { status: 400 })
    }

    // Декодируем данные
    const decodedData = JSON.parse(Buffer.from(data, 'base64').toString())
    
    console.log('💰 LiqPay callback отримано:', decodedData)

    // Сохраняем платеж в базу данных
    try {
      const client = await clientPromise
      const db = client.db()

      const paymentData: any = {
        orderId: decodedData.order_id,
        transactionId: decodedData.transaction_id || decodedData.payment_id,
        amount: Number(decodedData.amount),
        currency: decodedData.currency || 'UAH',
        status: decodedData.status,
        paymentMethod: 'liqpay',
        description: decodedData.description || 'Музичне привітання',
        liqpayData: decodedData, // Сохраняем все данные от LiqPay
        createdAt: new Date(),
        updatedAt: new Date()
      }

      // Пытаемся найти пользователя по order_id (если есть связь с приветствием)
      if (decodedData.order_id) {
        const greeting = await db.collection('greetings').findOne({
          taskId: { $regex: decodedData.order_id.replace('order_', '') }
        })
        
        if (greeting) {
          paymentData.userId = greeting.userId
          paymentData.userEmail = greeting.userId // В нашем случае userId = email
          paymentData.taskId = greeting.taskId
          paymentData.recipientName = greeting.recipientName
          paymentData.occasion = greeting.occasion
          paymentData.plan = greeting.plan
        }
      }

      // Проверяем, существует ли уже платеж
      const existingPayment = await db.collection('payments').findOne({
        $or: [
          { orderId: decodedData.order_id },
          { transactionId: decodedData.transaction_id || decodedData.payment_id }
        ]
      })

      if (existingPayment) {
        // Обновляем существующий платеж
        await db.collection('payments').updateOne(
          { _id: existingPayment._id },
          { $set: { ...paymentData, updatedAt: new Date() } }
        )
        console.log(`💰 Платеж оновлено в БД: ${decodedData.order_id}, статус: ${decodedData.status}`)
      } else {
        // Создаем новый платеж
        await db.collection('payments').insertOne(paymentData)
        console.log(`💰 Новий платеж збережено в БД: ${decodedData.order_id}, сума: ${decodedData.amount} ${decodedData.currency}`)
      }

    } catch (dbError) {
      console.error('❌ Помилка збереження платежу в БД:', dbError)
    }

    // Обрабатываем статус платежа
    if (decodedData.status === 'success') {
      // Платеж успешен
      console.log('✅ Платеж успішний:', decodedData.order_id)
      return NextResponse.json({ success: true })
    } else if (decodedData.status === 'failure') {
      // Платеж неуспешен
      console.log('❌ Платеж не вдався:', decodedData.order_id)
      return NextResponse.json({ success: false, error: 'Платеж не вдався' })
    } else {
      // Другие статусы (waiting, etc.)
      console.log('⏳ Платеж в обробці:', decodedData.order_id, 'статус:', decodedData.status)
      return NextResponse.json({ success: true, status: decodedData.status })
    }

  } catch (error) {
    console.error('❌ LiqPay callback помилка:', error)
    return NextResponse.json({ error: 'Помилка обробки callback' }, { status: 500 })
  }
} 