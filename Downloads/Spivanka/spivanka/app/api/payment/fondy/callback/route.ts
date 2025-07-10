import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import clientPromise from '@/lib/mongodb'

const FONDY_SECRET_KEY = process.env.FONDY_SECRET_KEY || ''

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log('💰 Fondy callback отримано:', body)

    if (!body.order_id || !body.signature) {
      return NextResponse.json({ error: 'Відсутні обов\'язкові дані' }, { status: 400 })
    }

    // Проверяем подпись
    const isValidSignature = verifyFondySignature(body, FONDY_SECRET_KEY)
    
    if (!isValidSignature) {
      console.error('❌ Невірна підпис Fondy')
      return NextResponse.json({ error: 'Невірна підпис' }, { status: 400 })
    }

    // Сохраняем платеж в базу данных
    try {
      const client = await clientPromise
      const db = client.db()

      const paymentData: any = {
        orderId: body.order_id,
        transactionId: body.payment_id || body.transaction_id,
        amount: Number(body.amount) / 100, // Fondy возвращает в копейках
        currency: body.currency || 'UAH',
        status: mapFondyStatus(body.order_status),
        paymentMethod: 'fondy',
        description: body.order_desc || 'Музичне привітання',
        fondyData: body, // Сохраняем все данные от Fondy
        createdAt: new Date(),
        updatedAt: new Date()
      }

      // Пытаемся найти пользователя по order_id (если есть связь с приветствием)
      if (body.order_id) {
        const greeting = await db.collection('greetings').findOne({
          taskId: { $regex: body.order_id.replace('order_', '') }
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
          { orderId: body.order_id },
          { transactionId: body.payment_id || body.transaction_id }
        ]
      })

      if (existingPayment) {
        // Обновляем существующий платеж
        await db.collection('payments').updateOne(
          { _id: existingPayment._id },
          { $set: { ...paymentData, updatedAt: new Date() } }
        )
        console.log(`💰 Платеж оновлено в БД: ${body.order_id}, статус: ${body.order_status}`)
      } else {
        // Создаем новый платеж
        await db.collection('payments').insertOne(paymentData)
        console.log(`💰 Новий платеж збережено в БД: ${body.order_id}, сума: ${paymentData.amount} ${paymentData.currency}`)
      }

    } catch (dbError) {
      console.error('❌ Помилка збереження платежу в БД:', dbError)
    }

    // Обрабатываем статус платежа
    if (body.order_status === 'approved') {
      // Платеж успешен
      console.log('✅ Платеж успішний:', body.order_id)
      return NextResponse.json({ success: true })
    } else if (body.order_status === 'declined') {
      // Платеж неуспешен
      console.log('❌ Платеж не вдався:', body.order_id)
      return NextResponse.json({ success: false, error: 'Платеж не вдався' })
    } else {
      // Другие статусы (processing, etc.)
      console.log('⏳ Платеж в обробці:', body.order_id, 'статус:', body.order_status)
      return NextResponse.json({ success: true, status: body.order_status })
    }

  } catch (error) {
    console.error('❌ Fondy callback помилка:', error)
    return NextResponse.json({ error: 'Помилка обробки callback' }, { status: 500 })
  }
}

// Функция проверки подписи Fondy согласно официальной документации
function verifyFondySignature(data: any, secretKey: string): boolean {
  if (!secretKey) return false
  
  const { signature, response_signature_string, ...params } = data
  
  // Фильтруем пустые значения
  const filteredData = Object.fromEntries(
    Object.entries(params).filter(([key, value]) => 
      value !== null && value !== undefined && value !== ''
    )
  )
  
  // Сортируем ключи в алфавитном порядке
  const sortedKeys = Object.keys(filteredData).sort()
  
  // Собираем значения в алфавитном порядке
  const values = sortedKeys.map(key => filteredData[key])
  
  // Добавляем секретный ключ в начало
  values.unshift(secretKey)
  
  // Соединяем символом |
  const stringToSign = values.join('|')
  
  // Создаем SHA-1 хеш в нижнем регистре
  const expectedSignature = crypto.createHash('sha1').update(stringToSign).digest('hex')
  
  console.log('🔐 Fondy signature verification:', {
    received: signature,
    expected: expectedSignature,
    string: stringToSign.replace(secretKey, '***SECRET***')
  })
  
  return signature === expectedSignature
}

// Функция маппинга статусов Fondy в наши статусы
function mapFondyStatus(fondyStatus: string): 'success' | 'pending' | 'failed' {
  switch (fondyStatus) {
    case 'approved':
      return 'success'
    case 'declined':
    case 'expired':
    case 'reversed':
      return 'failed'
    case 'processing':
    case 'created':
    default:
      return 'pending'
  }
}
