import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import clientPromise from '@/lib/mongodb'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 })
    }

    const client = await clientPromise
    const db = client.db()

    // Получаем все платежи пользователя
    const payments = await db.collection('payments')
      .find({ 
        $or: [
          { userId: session.user.email },
          { userEmail: session.user.email }
        ]
      })
      .sort({ createdAt: -1 })
      .toArray()

    // Преобразуем ObjectId в строку
    const formattedPayments = payments.map(payment => ({
      id: payment._id.toString(),
      taskId: payment.taskId,
      orderId: payment.orderId,
      transactionId: payment.transactionId,
      amount: payment.amount,
      plan: payment.plan,
      status: payment.status,
      paymentMethod: payment.paymentMethod,
      description: payment.description,
      recipientName: payment.recipientName,
      occasion: payment.occasion,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt
    }))

    return NextResponse.json({
      success: true,
      payments: formattedPayments
    })

  } catch (error) {
    console.error('❌ Помилка отримання платежів:', error)
    return NextResponse.json(
      { error: 'Помилка отримання платежів' },
      { status: 500 }
    )
  }
}