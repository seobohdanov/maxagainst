import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import clientPromise from '@/lib/mongodb'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    console.log('🗑️ Очищаю кэш календаря для:', session.user.email)

    // Подключаемся к базе данных
    const client = await clientPromise
    const db = client.db('spivanka')
    const collection = db.collection('calendar_cache')
    
    // Удаляем кэш пользователя
    const result = await collection.deleteOne({ userEmail: session.user.email })
    
    if (result.deletedCount > 0) {
      console.log('✅ Кэш календаря очищен')
      return NextResponse.json({
        success: true,
        message: 'Кэш календаря очищен'
      })
    } else {
      console.log('ℹ️ Кэш календаря не найден')
      return NextResponse.json({
        success: true,
        message: 'Кэш календаря не найден'
      })
    }
    
  } catch (error) {
    console.error('❌ Ошибка очистки кэша календаря:', error)
    return NextResponse.json({ 
      error: 'Ошибка очистки кэша календаря',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 })
  }
} 