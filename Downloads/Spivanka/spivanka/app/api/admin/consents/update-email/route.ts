import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import clientPromise from '@/lib/mongodb'

export async function POST(request: NextRequest) {
  try {
    // Проверяем авторизацию админа
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Не авторизований' },
        { status: 401 }
      )
    }

    // Проверяем, является ли пользователь админом
    if (session.user.email !== 'seobohdanov@gmail.com') {
      return NextResponse.json(
        { success: false, error: 'Доступ заборонено' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { sessionId, email } = body

    if (!sessionId || !email) {
      return NextResponse.json(
        { success: false, error: 'SessionId та email обов\'язкові' },
        { status: 400 }
      )
    }

    const client = await clientPromise
    const db = client.db()
    const consentCollection = db.collection('user_consents')

    // Обновляем email для записи с указанным sessionId
    const result = await consentCollection.updateOne(
      { sessionId: sessionId },
      { 
        $set: {
          email: email.toLowerCase(),
          updatedAt: new Date()
        }
      }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Запис з таким sessionId не знайдено' },
        { status: 404 }
      )
    }

    console.log(`✅ Оновлено email для sessionId: ${sessionId} -> ${email}`)

    return NextResponse.json({
      success: true,
      message: 'Email успішно оновлено'
    })

  } catch (error) {
    console.error('❌ Помилка оновлення email:', error)
    return NextResponse.json(
      { success: false, error: 'Помилка оновлення email' },
      { status: 500 }
    )
  }
} 