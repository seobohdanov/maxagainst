import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import clientPromise from '@/lib/mongodb'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 })
    }

    const {
      taskId,
      orderId,
      amount,
      plan,
      status,
      transactionId,
      paymentMethod = 'liqpay',
      description,
      recipientName,
      occasion
    } = await request.json()

    if (!amount || !plan) {
      return NextResponse.json({ error: 'Відсутні обов\'язкові дані' }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db()

    const paymentData = {
      taskId: taskId || null,
      orderId: orderId || `order_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      transactionId: transactionId || null,
      userEmail: session.user.email,
      userId: session.user.email, // Используем email как userId
      amount: Number(amount),
      plan,
      status: status || 'success',
      paymentMethod,
      description: description || `Музичне привітання - ${plan} план`,
      recipientName: recipientName || '',
      occasion: occasion || '',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    // Проверяем, существует ли уже платеж для этого taskId или orderId
    const existingPayment = await db.collection('payments').findOne({
      $or: [
        { taskId: taskId },
        { orderId: orderId }
      ]
    })

    let paymentId
    if (existingPayment) {
      // Обновляем существующий платеж
      await db.collection('payments').updateOne(
        { _id: existingPayment._id },
        { $set: { ...paymentData, updatedAt: new Date() } }
      )
      paymentId = existingPayment._id
      console.log(`💰 Платеж оновлено для ${taskId || orderId}:`, paymentData.amount, '₴')
    } else {
      // Создаем новый платеж
      const result = await db.collection('payments').insertOne(paymentData)
      paymentId = result.insertedId
      console.log(`💰 Новий платеж збережено для ${taskId || orderId}:`, paymentData.amount, '₴')
    }

    return NextResponse.json({
      success: true,
      paymentId,
      message: 'Платеж збережено'
    })

  } catch (error) {
    console.error('❌ Помилка збереження платежу:', error)
    return NextResponse.json(
      { error: 'Помилка збереження платежу' },
      { status: 500 }
    )
  }
}