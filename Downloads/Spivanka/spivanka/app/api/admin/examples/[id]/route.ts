import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import clientPromise from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Проверяем авторизацию админа
    const session = await getServerSession(authOptions)
    if (!session?.user?.email || session.user.email !== 'seobohdanov@gmail.com') {
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 })
    }

    const { id } = await params
    const client = await clientPromise
    const db = client.db()

    // Убираем приветствие из публичных примеров
    const result = await db.collection('greetings').updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          makePublic: false,
          allowSharing: false,
          updatedAt: new Date()
        } 
      }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Пример не найден' }, { status: 404 })
    }

    console.log('✅ Пример удален из публичной галереи:', id)
    
    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Ошибка удаления примера:', error)
    return NextResponse.json(
      { error: 'Ошибка удаления примера' },
      { status: 500 }
    )
  }
} 