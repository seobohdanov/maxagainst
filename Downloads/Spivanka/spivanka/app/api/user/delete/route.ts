import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import clientPromise from '@/lib/mongodb'

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const client = await clientPromise
    const db = client.db()
    const userEmail = session.user.email

    // Удаляем все данные пользователя
    const deletePromises = [
      // Удаляем поздравления (ищем по userId)
      db.collection('greetings').deleteMany({ userId: userEmail }),
      
      // Удаляем статусы генерации (ищем по userId)
      db.collection('generation_status').deleteMany({ userId: userEmail }),
      
      // Удаляем платежи (ищем по userEmail)
      db.collection('payments').deleteMany({ userEmail }),
      
      // Удаляем токены календаря (ищем по userEmail)
      db.collection('calendar_tokens').deleteMany({ userEmail }),
      
      // Удаляем кэш календаря (ищем по userEmail)
      db.collection('calendar_cache').deleteMany({ userEmail })
    ]

    const results = await Promise.all(deletePromises)
    
    // Логируем результаты удаления
    console.log(`🗑️ Результаты удаления для ${userEmail}:`)
    console.log(`  - Поздравления: ${results[0].deletedCount}`)
    console.log(`  - Статусы генерации: ${results[1].deletedCount}`)
    console.log(`  - Платежи: ${results[2].deletedCount}`)
    console.log(`  - Токены календаря: ${results[3].deletedCount}`)
    console.log(`  - Кэш календаря: ${results[4].deletedCount}`)

    console.log(`🗑️ Удален аккаунт пользователя: ${userEmail}`)

    // Проверяем, что данные действительно удалены
    const remainingGreetings = await db.collection('greetings').countDocuments({ userId: userEmail })
    const remainingStatuses = await db.collection('generation_status').countDocuments({ userId: userEmail })
    const remainingPayments = await db.collection('payments').countDocuments({ userEmail })
    
    console.log(`🔍 Проверка удаления для ${userEmail}:`)
    console.log(`  - Осталось поздравлений: ${remainingGreetings}`)
    console.log(`  - Осталось статусов: ${remainingStatuses}`)
    console.log(`  - Осталось платежей: ${remainingPayments}`)

    return NextResponse.json({ 
      success: true, 
      message: 'Аккаунт успішно видалено',
      deletedCounts: {
        greetings: results[0].deletedCount,
        generationStatus: results[1].deletedCount,
        payments: results[2].deletedCount,
        calendarTokens: results[3].deletedCount,
        calendarCache: results[4].deletedCount
      }
    })

  } catch (error) {
    console.error('Ошибка удаления аккаунта:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 