import { NextRequest, NextResponse } from 'next/server'
import { clearStatusCache } from '@/services/sunoService'

export async function POST(request: NextRequest) {
  try {
    console.log('🗑️ Запит на очищення кешу')
    
    // Получаем taskId из query параметров
    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get('taskId')
    
    if (taskId) {
      clearStatusCache(taskId)
      console.log(`🗑️ Кеш очищено для taskId: ${taskId}`)
    } else {
      clearStatusCache()
      console.log('🗑️ Весь кеш очищено')
    }

    return NextResponse.json({ success: true, message: 'Кеш очищено' })
  } catch (error) {
    console.error('❌ Помилка очищення кешу:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 