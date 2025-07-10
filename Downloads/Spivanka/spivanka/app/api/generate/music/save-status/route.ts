import { NextRequest, NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import type { GenerationStatus, Plan } from '@/types'
import { handleApiError, validateFormData, calculatePlanPrice } from '@/lib/utils'
import { ObjectId } from 'mongodb'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      taskId, 
      status, 
      type, 
      musicUrl, 
      coverUrl, 
      secondMusicUrl, 
      data,
      formData,
      text,
      openaiCoverStatus,
      openaiCoverUrl,
      openaiCoverError,
      action
    } = body

    // Если это запрос на получение статуса
    if (action === 'get' && taskId) {
      return await getGenerationStatus(taskId)
    }

    // Валидация обязательных полей
    if (!taskId) {
      return NextResponse.json(
        { success: false, error: 'TaskId обов\'язковий' },
        { status: 400 }
      )
    }

    console.log(`💾 Збереження статусу генерації для taskId: ${taskId}`)
    console.log(`📊 Статус: ${status}`)
    console.log(`📝 Текст: ${text?.substring(0, 100)}`)
    console.log(`🖼️ Обкладинка: ${coverUrl}`)
    console.log(`🎵 Музика: ${musicUrl}`)
    console.log(`🎵 Друга музика: ${secondMusicUrl}`)
    console.log(`🖼️ OpenAI статус:`, openaiCoverStatus)
    console.log(`🖼️ OpenAI обкладинка:`, openaiCoverUrl)
    console.log(`🖼️ OpenAI помилка:`, openaiCoverError)

    // Получаем userId из сессии или formData
    const session = await getServerSession(authOptions)
    const userId = session?.user?.email || formData?.userId || data?.userId

    const client = await clientPromise
    const db = client.db()
    
    const statusRecord = {
      taskId,
      userId: userId || '',
      status: status as GenerationStatus,
      type: type || 'generation',
      musicUrl: musicUrl || '',
      coverUrl: coverUrl || '',
      secondMusicUrl: secondMusicUrl || '',
      openaiCoverStatus: openaiCoverStatus || '',
      openaiCoverUrl: openaiCoverUrl || '',
      openaiCoverError: openaiCoverError || '',
      data: data || {},
      formData: formData || {},
      text: text || '',
      updatedAt: new Date()
    }

    // Обновляем или создаем запись состояния генерации
    await db.collection('generation_status').updateOne(
      { taskId },
      { 
        $set: statusRecord,
        $setOnInsert: { createdAt: new Date() }
      },
      { upsert: true }
    )

    console.log(`✅ Статус збережено в БД: ${status}`)

    // Сохраняем/обновляем поздравление в основной таблице
    if (shouldSaveGreeting(status) && formData && text && userId) {
      await saveOrUpdateGreeting(db, taskId, status, statusRecord)
    }

    // Если статус SUCCESS, обновляем статус карточки в дашборде
    if (status === 'SUCCESS') {
      await db.collection('greetings').updateOne(
        { taskId },
        { 
          $set: { 
            status: 'SUCCESS',
            updatedAt: new Date()
          }
        }
      )
    }

    return NextResponse.json({ success: true, taskId, status })

  } catch (error) {
    console.error('❌ Помилка збереження статусу:', error)
    const errorResponse = handleApiError(error)
    return NextResponse.json(errorResponse, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get('taskId')

    if (!taskId) {
      return NextResponse.json(
        { success: false, error: 'TaskId обов\'язковий' },
        { status: 400 }
      )
    }

    return await getGenerationStatus(taskId)

  } catch (error) {
    console.error('❌ Помилка отримання статусу:', error)
    const errorResponse = handleApiError(error)
    return NextResponse.json(errorResponse, { status: 500 })
  }
}

// Вспомогательные функции
async function getGenerationStatus(taskId: string) {
  try {
    const client = await clientPromise
    const db = client.db()
    
    const statusRecord = await db.collection('generation_status').findOne({ taskId })
    
    if (!statusRecord) {
      return NextResponse.json(
        { success: false, error: 'Статус не знайдено' }, 
        { status: 404 }
      )
    }

    console.log(`✅ Статус знайдено в БД: ${statusRecord.status}`)
    return NextResponse.json({
      success: true,
      ...statusRecord
    })

  } catch (error) {
    console.error('❌ Помилка отримання статусу з БД:', error)
    return NextResponse.json(
      { success: false, error: 'Помилка отримання статусу' },
      { status: 500 }
    )
  }
}

function shouldSaveGreeting(status: GenerationStatus): boolean {
  return ['TEXT_SUCCESS', 'FIRST_SUCCESS', 'SUCCESS'].includes(status)
}

async function saveOrUpdateGreeting(db: any, taskId: string, status: GenerationStatus, statusRecord: any) {
  try {
    const userId = statusRecord.userId
    if (!userId) {
      console.log('⚠️ Відсутній userId, пропускаю збереження привітання')
      return
    }

    // Получаем цены из настроек
    const settingsCollection = db.collection('settings')
    const settings = await settingsCollection.findOne({})
    const basicPrice = settings?.basicPlanPrice || 100
    const premiumPrice = settings?.premiumPlanPrice || 200

    // Создаем данные для приветствия
    const plan = statusRecord.formData?.plan || 'basic'
    const greetingData = {
      taskId,
      recipientName: statusRecord.formData?.recipientName || '',
      occasion: statusRecord.formData?.occasion || '',
      relationship: statusRecord.formData?.relationship || '',
      personalDetails: statusRecord.formData?.personalDetails || '',
      musicStyle: statusRecord.formData?.musicStyle || '',
      mood: statusRecord.formData?.mood || '',
      greetingLanguage: statusRecord.formData?.greetingLanguage || 'uk',
      text: statusRecord.text || '',
      plan: plan,
      totalPrice: calculatePlanPrice(plan, basicPrice, premiumPrice),
      paymentMethod: 'liqpay',
      musicUrl: statusRecord.musicUrl || '',
      secondMusicUrl: statusRecord.secondMusicUrl || '',
      coverUrl: statusRecord.coverUrl || '',
      allowSharing: false,
      userId,
      status,
      updatedAt: new Date()
    }

    // Валидация данных формы
    const validation = validateFormData(statusRecord.formData)
    if (!validation.isValid) {
      console.log('⚠️ Невалідні дані форми:', validation.errors)
      return
    }

    // Проверяем, есть ли уже приветствие в базе
    const existingGreeting = await db.collection('greetings').findOne({ taskId, userId })
    
    if (!existingGreeting) {
      // Создаем новое приветствие
      await db.collection('greetings').insertOne({
        ...greetingData,
        createdAt: new Date()
      })
      console.log(`✅ Нове привітання створено при статусі ${status}`)
    } else {
      // Обновляем существующее приветствие
      await db.collection('greetings').updateOne(
        { taskId, userId },
        { $set: greetingData }
      )
      console.log(`✅ Привітання оновлено при статусі ${status}`)
    }

  } catch (error) {
    console.error(`❌ Помилка збереження привітання при статусі ${status}:`, error)
  }
} 