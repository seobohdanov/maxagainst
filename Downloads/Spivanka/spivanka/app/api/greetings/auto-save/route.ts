import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { saveGreeting, getGreetingById } from '@/services/databaseService'
import clientPromise from '@/lib/mongodb'
import type { Greeting } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { taskId, ...greetingData } = body

    if (!taskId) {
      return NextResponse.json(
        { error: 'TaskId is required' },
        { status: 400 }
      )
    }

    // Проверяем, есть ли уже приветствие с таким taskId для этого пользователя
    const existingGreeting = await getGreetingById(taskId)
    
    if (existingGreeting && existingGreeting.userId === session.user.email) {
      console.log('✅ Привітання вже існує для користувача, пропускаю збереження')
      return NextResponse.json({
        success: true,
        greeting: existingGreeting,
        message: 'Greeting already exists'
      })
    }

    // Создаем новое приветствие
    const savedGreeting = await saveGreeting({
      ...greetingData,
      taskId,
      userId: session.user.email
    })

    console.log('✅ Автозбереження привітання:', savedGreeting.id)

    // Сохраняем платеж в базу данных
    if (greetingData.totalPrice && greetingData.plan) {
      try {
        const client = await clientPromise
        const db = client.db()

        const paymentData = {
          taskId: taskId,
          orderId: `order_${taskId}`,
          userEmail: session.user.email,
          userId: session.user.email,
          amount: Number(greetingData.totalPrice),
          plan: greetingData.plan,
          status: 'success', // При успешной генерации считаем платеж успешным
          paymentMethod: greetingData.paymentMethod || 'fondy',
          description: `Музичне привітання для ${greetingData.recipientName} - ${greetingData.plan} план`,
          recipientName: greetingData.recipientName || '',
          occasion: greetingData.occasion || '',
          createdAt: new Date(),
          updatedAt: new Date()
        }

        // Проверяем, существует ли уже платеж
        const existingPayment = await db.collection('payments').findOne({
          taskId: taskId,
          userId: session.user.email
        })

        if (!existingPayment) {
          await db.collection('payments').insertOne(paymentData)
          console.log(`💰 Платеж збережено: ${paymentData.amount} ₴ для ${greetingData.recipientName}`)
        } else {
          console.log(`💰 Платеж вже існує для taskId: ${taskId}`)
        }

      } catch (paymentError) {
        console.error('❌ Помилка збереження платежу:', paymentError)
        // Не прерываем выполнение, платеж не критичен для сохранения приветствия
      }
    }

    return NextResponse.json({
      success: true,
      greeting: savedGreeting
    })
  } catch (error) {
    console.error('Error auto-saving greeting:', error)
    return NextResponse.json(
      { error: 'Failed to auto-save greeting' },
      { status: 500 }
    )
  }
} 