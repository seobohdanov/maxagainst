import { NextRequest, NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

// В реальном приложении здесь можно сохранять callback данные в базу данных
const callbackData = new Map<string, any>()

export async function POST(request: NextRequest) {
  try {
    console.log('📥 Отримано POST запит на callback endpoint')
    const data = await request.json()
    console.log('📥 Отримано callback від Suno API:', JSON.stringify(data, null, 2))

    // Пытаемся извлечь taskId из разных возможных мест
    let taskId = null
    
    if (data.data && data.data.task_id) {
      taskId = data.data.task_id
    } else if (data.data && data.data.taskId) {
      taskId = data.data.taskId
    } else if (data.task_id) {
      taskId = data.task_id
    } else if (data.taskId) {
      taskId = data.taskId
    }

    if (taskId) {
      callbackData.set(taskId, data)
      console.log(`✅ Callback дані збережено для taskId: ${taskId}`)
      console.log(`📊 Загальна кількість збережених callback'ів: ${callbackData.size}`)
      
      // Сохраняем callback данные в базу данных
      try {
        const client = await clientPromise
        const db = client.db()
        
        // Извлекаем обложку из callback данных
        let coverUrl = ''
        if (data.data && data.data.source_image_url) {
          coverUrl = data.data.source_image_url
          console.log('🖼️ Отримано обкладинку з callback:', coverUrl)
        }
        
        const callbackRecord = {
          taskId,
          callbackData: data,
          coverUrl,
          receivedAt: new Date()
        }
        
        await db.collection('suno_callbacks').updateOne(
          { taskId },
          { $set: callbackRecord },
          { upsert: true }
        )
        
        console.log(`💾 Callback дані збережено в БД для taskId: ${taskId}`)
      } catch (dbError) {
        console.error('❌ Помилка збереження callback в БД:', dbError)
      }
    } else {
      console.log('⚠️ Не вдалося знайти taskId в callback даних:', data)
      console.log('⚠️ Неправильна структура callback даних')
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ Помилка обробки callback:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const taskId = searchParams.get('taskId')

  console.log(`🔍 GET запит на callback endpoint для taskId: ${taskId}`)
  console.log(`📊 Загальна кількість збережених callback'ів: ${callbackData.size}`)

  if (!taskId) {
    console.log('❌ Task ID не надано')
    return NextResponse.json({ error: 'Task ID is required' }, { status: 400 })
  }

  // Сначала проверяем базу данных
  try {
    const client = await clientPromise
    const db = client.db()
    
    const callbackRecord = await db.collection('suno_callbacks').findOne({ taskId })
    
    if (callbackRecord) {
      console.log(`📤 Повертаю callback дані з БД для taskId: ${taskId}`)
      return NextResponse.json(callbackRecord)
    }
  } catch (dbError) {
    console.error('❌ Помилка отримання callback з БД:', dbError)
  }

  // Fallback на память
  const data = callbackData.get(taskId)
  if (data) {
    console.log(`📤 Повертаю callback дані з пам'яті для taskId: ${taskId}`)
    return NextResponse.json(data)
  }

  console.log(`❌ Callback дані не знайдено для taskId: ${taskId}`)
  console.log(`🔍 Доступні taskId:`, Array.from(callbackData.keys()))
  return NextResponse.json({ error: 'Callback data not found' }, { status: 404 })
} 