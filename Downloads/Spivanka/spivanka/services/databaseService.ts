import type { Greeting, GenerationStatus } from '@/types'
import clientPromise from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import { handleApiError, getPlanPrices, calculatePlanPrice } from '@/lib/utils'
import { setSecureValue, getSecureValue } from '@/lib/encryption'

// В продакшене используйте реальное подключение к MongoDB
// Для разработки можно использовать MongoDB Atlas или локальную базу

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/spivanka'

// Простая реализация с localStorage для демонстрации
// В реальном приложении замените на MongoDB

// Расширяем тип Greeting для работы с MongoDB
type GreetingWithMongoId = Greeting & { _id?: ObjectId }

/**
 * Сохранение поздравления в базу данных
 */
export async function saveGreeting(greetingData: any): Promise<Greeting> {
  try {
    const client = await clientPromise
    const db = client.db()
    
    // Шифруем чувствительные данные
    const greeting = {
      ...greetingData,
      // Шифруем персональные данные
      recipientName: setSecureValue(greetingData.recipientName || ''),
      personalDetails: setSecureValue(greetingData.personalDetails || ''),
      relationship: setSecureValue(greetingData.relationship || ''),
      text: setSecureValue(greetingData.text || ''),
      createdAt: greetingData.createdAt || new Date(),
      updatedAt: new Date()
    }

    let result
    if (greetingData.taskId) {
      // Проверяем, есть ли уже поздравление с таким taskId
      const existing = await db.collection('greetings').findOne({ 
        $or: [
          { _id: greetingData.taskId },
          { taskId: greetingData.taskId }
        ]
      })
      
      if (existing) {
        // Обновляем существующее поздравление
        await db.collection('greetings').updateOne(
          { $or: [{ _id: greetingData.taskId }, { taskId: greetingData.taskId }] },
          { $set: { ...greeting, updatedAt: new Date() } }
        )
        console.log('✅ Привітання оновлено (upsert):', greetingData.taskId)
        result = { ...existing, ...greeting }
      } else {
        // Вставляем новое с taskId как _id
        result = await db.collection('greetings').insertOne({ 
          _id: greetingData.taskId, 
          ...greeting 
        })
        console.log('✅ Привітання збережено (insert):', greetingData.taskId)
        result = { ...greeting, id: greetingData.taskId }
      }
    } else {
      // Используем MongoDB ObjectId
      result = await db.collection('greetings').insertOne(greeting)
      console.log('✅ Привітання збережено з MongoDB ObjectId:', result.insertedId.toString())
      result = { ...greeting, id: result.insertedId.toString() }
    }

    return result as Greeting
  } catch (error) {
    console.error('❌ Помилка збереження привітання:', error)
    throw new Error('Не вдалося зберегти привітання')
  }
}

/**
 * Получение поздравлений пользователя
 */
export async function getUserGreetings(userId: string): Promise<Greeting[]> {
  try {
    console.log('🔍 getUserGreetings: Завантаження привітань для користувача:', userId)
    const client = await clientPromise
    const db = client.db()
    
    // Получаем записи из обеих коллекций
    const [greetingsFromGreetings, statusesFromGeneration] = await Promise.all([
      db.collection('greetings').find({ userId }).toArray(),
      db.collection('generation_status').find({ userId }).toArray()
    ])

    console.log('📊 getUserGreetings: З greetings колекції:', greetingsFromGreetings.length)
    console.log('📊 getUserGreetings: З generation_status колекції:', statusesFromGeneration.length)

    // Создаем Map для быстрого поиска по taskId
    const greetingsMap = new Map()
    
    // Добавляем записи из greetings коллекции
    greetingsFromGreetings.forEach(({ _id, ...greeting }) => {
      const id = _id?.toString() || greeting.id || ''
      const taskId = greeting.taskId || id
      
      // Расшифровываем чувствительные данные
      const decryptedGreeting = {
        ...greeting,
        recipientName: getSecureValue(greeting.recipientName || ''),
        personalDetails: getSecureValue(greeting.personalDetails || ''),
        relationship: getSecureValue(greeting.relationship || ''),
        text: getSecureValue(greeting.text || ''),
        id,
        taskId,
        source: 'greetings'
      }
      
      console.log('📋 getUserGreetings: Додаю з greetings:', {
        id,
        taskId,
        recipientName: decryptedGreeting.recipientName
      })
      
      greetingsMap.set(taskId, decryptedGreeting)
    })
    
    // Добавляем/обновляем записи из generation_status коллекции
    // ТОЛЬКО если они не существуют в greetings и имеют статус SUCCESS
    statusesFromGeneration.forEach((status) => {
      const taskId = status.taskId
      if (taskId && status.status === 'SUCCESS') {
        const existing = greetingsMap.get(taskId)
        if (existing) {
          // Обновляем существующую запись данными из generation_status
          console.log('🔄 getUserGreetings: Оновлюю існуючий запис з generation_status:', taskId)
          greetingsMap.set(taskId, {
            ...existing,
            status: status.status,
            musicUrl: status.musicUrl || existing.musicUrl,
            coverUrl: status.coverUrl || existing.coverUrl,
            secondMusicUrl: status.secondMusicUrl || existing.secondMusicUrl,
            text: status.text || existing.text,
            updatedAt: status.updatedAt || existing.updatedAt
          })
        } else {
          // Создаем новую запись из статуса ТОЛЬКО если она завершена
          console.log('📋 getUserGreetings: Створюю новий запис з generation_status:', taskId)
          
          // Правильно извлекаем formData из разных возможных мест
          const formData = status.formData || status.data?.formData || {}
          const plan = status.data?.selectedPlan || formData.plan || 'basic'
          
          const greetingData = {
            taskId: taskId,
            recipientName: formData.recipientName || '',
            occasion: formData.occasion || '',
            relationship: formData.relationship || '',
            personalDetails: formData.personalDetails || '',
            musicStyle: formData.musicStyle || '',
            mood: formData.mood || '',
            greetingLanguage: formData.greetingLanguage || 'uk',
            text: status.text || formData.text || '',
            plan: plan,
            totalPrice: plan === 'premium' ? 200 : 100, // Используем дефолтные цены
            paymentMethod: 'liqpay',
            musicUrl: status.musicUrl || formData.musicUrl || '',
            secondMusicUrl: status.secondMusicUrl || formData.secondMusicUrl || '',
            coverUrl: status.coverUrl || formData.coverUrl || '',
            allowSharing: false,
            userId: status.userId || formData.userId || userId,
            status: status.status || 'SUCCESS',
            createdAt: status.createdAt || new Date(),
            updatedAt: status.updatedAt || new Date()
          }
          
          // Расшифровываем чувствительные данные из generation_status
          const decryptedGreetingData = {
            ...greetingData,
            recipientName: getSecureValue(greetingData.recipientName || ''),
            personalDetails: getSecureValue(greetingData.personalDetails || ''),
            relationship: getSecureValue(greetingData.relationship || ''),
            text: getSecureValue(greetingData.text || '')
          }
          greetingsMap.set(taskId, {
            ...decryptedGreetingData,
            id: taskId,
            taskId,
            source: 'generation_status'
          })
        }
      } else if (taskId) {
        console.log('⚠️ getUserGreetings: Пропускаю запис з generation_status (статус не SUCCESS):', {
          taskId,
          status: status.status
        })
      }
    })

    // Преобразуем Map в массив и сортируем по дате создания
    const allGreetings: Greeting[] = Array.from(greetingsMap.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    console.log(`✅ Отримано ${allGreetings.length} привітань для користувача:`, userId)
    console.log('🔍 Деталі записів:', allGreetings.map(g => ({
      id: g.id,
      taskId: g.taskId,
      status: g.status,
      musicStyle: g.musicStyle,
      mood: g.mood,
      greetingLanguage: g.greetingLanguage,
      source: (g as any).source
    })))
    
    return allGreetings
  } catch (error) {
    console.error('❌ Помилка отримання привітань:', error)
    throw new Error('Не вдалося отримати привітання')
  }
}

/**
 * Получение публичных поздравлений для примеров
 */
export async function getPublicGreetings(limit: number = 10): Promise<Greeting[]> {
  try {
    const client = await clientPromise
    const db = client.db()
    
    const greetings = await db
      .collection('greetings')
      .find({ 
        $or: [
          { allowSharing: true },
          { makePublic: true }
        ],
        status: 'SUCCESS',
        musicUrl: { $exists: true, $ne: '' }
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray() as GreetingWithMongoId[]

    // Преобразуем _id в строки и убираем чувствительные данные
    const publicGreetings: Greeting[] = greetings.map(({ _id, userId, ...greeting }) => ({
      ...greeting,
      id: _id?.toString() || greeting.id || '',
      userId: 'anonymous' // Скрываем реальный userId
    }))

    console.log(`✅ Отримано ${publicGreetings.length} публічних привітань`)
    
    return publicGreetings
  } catch (error) {
    console.error('❌ Помилка отримання публічних привітань:', error)
    throw new Error('Не вдалося отримати публічні привітання')
  }
}

/**
 * Обновление поздравления
 */
export async function updateGreeting(greetingId: string, updates: Partial<Greeting>): Promise<Greeting> {
  try {
    const client = await clientPromise
    const db = client.db()
    
    let result: any = null
    
    // Сначала пробуем обновить по taskId (прямое совпадение _id)
    result = await db
      .collection('greetings')
      .findOneAndUpdate(
        { _id: greetingId } as any,
        { 
          $set: { 
            ...updates, 
            updatedAt: new Date() 
          } 
        },
        { returnDocument: 'after' }
      )
    
    // Если не найдено и это похоже на MongoDB ObjectId, пробуем обновить по ObjectId
    if (!result && ObjectId.isValid(greetingId)) {
      result = await db
        .collection('greetings')
        .findOneAndUpdate(
          { _id: new ObjectId(greetingId) },
          { 
            $set: { 
              ...updates, 
              updatedAt: new Date() 
            } 
          },
          { returnDocument: 'after' }
        )
    }

    // Если все еще не найдено, пробуем по полю taskId
    if (!result) {
      result = await db
        .collection('greetings')
        .findOneAndUpdate(
          { taskId: greetingId },
          { 
            $set: { 
              ...updates, 
              updatedAt: new Date() 
            } 
          },
          { returnDocument: 'after' }
        )
    }

    if (!result) {
      throw new Error('Привітання не знайдено')
    }

    const updatedGreeting: Greeting = {
      ...result,
      id: result._id?.toString() || ''
    }
    delete (updatedGreeting as any)._id

    console.log('✅ Привітання оновлено:', updatedGreeting.id)
    
    return updatedGreeting
  } catch (error) {
    console.error('❌ Помилка оновлення привітання:', error)
    throw new Error('Не вдалося оновити привітання')
  }
}

/**
 * Удаление поздравления
 */
export async function deleteGreeting(greetingId: string): Promise<void> {
  try {
    console.log('🗑️ Початок видалення привітання:', greetingId)
    const client = await clientPromise
    const db = client.db()
    
    let deletedCount = 0
    
    // Сначала проверяем, что поздравление существует в greetings
    const existingGreeting = await db.collection('greetings').findOne({ 
      $or: [
        { _id: greetingId } as any,
        { taskId: greetingId },
        ObjectId.isValid(greetingId) ? { _id: new ObjectId(greetingId) } : null
      ].filter(Boolean)
    })
    
    // Также проверяем в generation_status
    const existingStatus = await db.collection('generation_status').findOne({ taskId: greetingId })
    
    if (existingGreeting) {
      console.log('📋 Знайдено привітання в greetings для видалення:', {
        _id: existingGreeting._id,
        taskId: existingGreeting.taskId,
        recipientName: existingGreeting.recipientName
      })
    }
    
    if (existingStatus) {
      console.log('📋 Знайдено привітання в generation_status для видалення:', {
        taskId: existingStatus.taskId,
        status: existingStatus.status,
        userId: existingStatus.userId
      })
    }
    
    if (!existingGreeting && !existingStatus) {
      console.log('❌ Привітання не знайдено в жодній колекції:', greetingId)
      throw new Error('Привітання не знайдено')
    }
    
    // Удаляем из greetings коллекции всеми возможными способами
    const greetingsResults = await Promise.all([
      db.collection('greetings').deleteOne({ _id: greetingId } as any),
      ObjectId.isValid(greetingId) ? db.collection('greetings').deleteOne({ _id: new ObjectId(greetingId) }) : Promise.resolve({ deletedCount: 0 }),
      db.collection('greetings').deleteOne({ taskId: greetingId })
    ])
    
    const greetingsDeleted = greetingsResults.reduce((sum, result) => sum + result.deletedCount, 0)
    console.log('🗑️ Результат видалення з greetings:', greetingsDeleted)
    
    // Удаляем из generation_status коллекции всеми возможными способами
    const statusResults = await Promise.all([
      db.collection('generation_status').deleteOne({ taskId: greetingId }),
      ObjectId.isValid(greetingId) ? db.collection('generation_status').deleteOne({ _id: new ObjectId(greetingId) }) : Promise.resolve({ deletedCount: 0 }),
      db.collection('generation_status').deleteOne({ _id: greetingId } as any)
    ])
    
    const statusDeleted = statusResults.reduce((sum, result) => sum + result.deletedCount, 0)
    console.log('🗑️ Результат видалення з generation_status:', statusDeleted)
    
    // Дополнительная очистка: удаляем все записи с таким же taskId (если это ObjectId из greetings)
    if (existingGreeting && existingGreeting.taskId && existingGreeting.taskId !== greetingId) {
      console.log('🧹 Додаткова очистка: видаляю записи з taskId:', existingGreeting.taskId)
      const additionalCleanup = await db.collection('generation_status').deleteMany({ taskId: existingGreeting.taskId })
      console.log('🧹 Додатково видалено з generation_status:', additionalCleanup.deletedCount)
    }
    
    deletedCount = greetingsDeleted + statusDeleted

    if (deletedCount === 0) {
      console.log('❌ Нічого не видалено для ID:', greetingId)
      throw new Error('Привітання не знайдено')
    }

    console.log('✅ Привітання видалено з обох колекцій:', greetingId, 'видалено записів:', deletedCount)
  } catch (error) {
    console.error('❌ Помилка видалення привітання:', error)
    throw new Error('Не вдалося видалити привітання')
  }
}

/**
 * Получение поздравления по ID
 */
export async function getGreetingById(greetingId: string): Promise<Greeting | null> {
  try {
    console.log('🔍 getGreetingById: Пошук привітання з ID:', greetingId)
    const client = await clientPromise
    const db = client.db()
    
    let greeting: any = null
    
    // Сначала пробуем найти в коллекции greetings
    greeting = await db.collection('greetings').findOne({ _id: greetingId } as any)
    
    // Если не найдено и это похоже на MongoDB ObjectId, пробуем найти по ObjectId
    if (!greeting && ObjectId.isValid(greetingId)) {
      greeting = await db.collection('greetings').findOne({ _id: new ObjectId(greetingId) })
    }

    // Если все еще не найдено, пробуем по полю taskId
    if (!greeting) {
      greeting = await db.collection('greetings').findOne({ taskId: greetingId })
    }

    // Если не найдено в greetings, ищем в generation_status
    if (!greeting) {
      console.log('🔍 getGreetingById: Не знайдено в greetings, шукаю в generation_status...')
      
      const statusRecord = await db.collection('generation_status').findOne({ taskId: greetingId })
      
      if (statusRecord) {
        console.log('📋 getGreetingById: Знайдено в generation_status:', {
          taskId: statusRecord.taskId,
          status: statusRecord.status,
          userId: statusRecord.userId
        })
        
        // Преобразуем запись из generation_status в формат Greeting
        const formData = statusRecord.formData || statusRecord.data?.formData || {}
        const plan = statusRecord.data?.selectedPlan || formData.plan || 'basic'
        
        greeting = {
          _id: statusRecord.taskId,
          taskId: statusRecord.taskId,
          recipientName: formData.recipientName || '',
          occasion: formData.occasion || '',
          relationship: formData.relationship || '',
          personalDetails: formData.personalDetails || '',
          musicStyle: formData.musicStyle || '',
          mood: formData.mood || '',
          greetingLanguage: formData.greetingLanguage || 'uk',
          text: statusRecord.text || formData.text || '',
          plan: plan,
          totalPrice: plan === 'premium' ? 200 : 100,
          paymentMethod: 'liqpay',
          musicUrl: statusRecord.musicUrl || formData.musicUrl || '',
          secondMusicUrl: statusRecord.secondMusicUrl || formData.secondMusicUrl || '',
          coverUrl: statusRecord.coverUrl || formData.coverUrl || '',
          allowSharing: false,
          userId: statusRecord.userId || formData.userId || '',
          status: statusRecord.status || 'SUCCESS',
          createdAt: statusRecord.createdAt || new Date(),
          updatedAt: statusRecord.updatedAt || new Date()
        }
      }
    }

    if (!greeting) {
      console.log('❌ getGreetingById: Привітання не знайдено в жодній колекції')
      return null
    }

    const greetingWithStringId: Greeting = {
      ...greeting,
      id: greeting._id?.toString() || greeting.taskId || ''
    }
    delete (greetingWithStringId as any)._id

    console.log('✅ getGreetingById: Привітання знайдено:', {
      id: greetingWithStringId.id,
      taskId: greetingWithStringId.taskId,
      userId: greetingWithStringId.userId,
      source: greeting.taskId ? 'generation_status' : 'greetings'
    })

    return greetingWithStringId
  } catch (error) {
    console.error('❌ Помилка отримання привітання:', error)
    throw new Error('Не вдалося отримати привітання')
  }
}

/**
 * Получение статистики пользователя
 */
export async function getUserStats(userId: string): Promise<{
  totalGreetings: number;
  successfulGreetings: number;
  pendingGreetings: number;
  publicGreetings: number;
}> {
  try {
    const client = await clientPromise
    const db = client.db()
    
    const [
      totalGreetings,
      successfulGreetings,
      pendingGreetings,
      publicGreetings
    ] = await Promise.all([
      db.collection('greetings').countDocuments({ userId }),
      db.collection('greetings').countDocuments({ userId, status: 'SUCCESS' }),
      db.collection('greetings').countDocuments({ 
        userId, 
        status: { $in: ['PENDING', 'TEXT_SUCCESS', 'FIRST_SUCCESS'] } 
      }),
      db.collection('greetings').countDocuments({ userId, allowSharing: true })
    ])

    return {
      totalGreetings,
      successfulGreetings,
      pendingGreetings,
      publicGreetings
    }
  } catch (error) {
    console.error('❌ Помилка отримання статистики:', error)
    throw new Error('Не вдалося отримати статистику')
  }
}

/**
 * Очистка старых незавершенных генераций (старше 24 часов)
 */
export async function cleanupOldGenerations(): Promise<number> {
  try {
    const client = await clientPromise
    const db = client.db()
    
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    
    // Удаляем старые статусы генерации
    const statusResult = await db.collection('generation_status').deleteMany({
      updatedAt: { $lt: oneDayAgo },
      status: { $in: ['PENDING', 'TEXT_SUCCESS', 'FIRST_SUCCESS'] }
    })

    // Удаляем старые незавершенные поздравления
    const greetingsResult = await db.collection('greetings').deleteMany({
      updatedAt: { $lt: oneDayAgo },
      status: { $in: ['PENDING', 'TEXT_SUCCESS', 'FIRST_SUCCESS'] },
      musicUrl: { $in: ['', null] }
    })

    const totalDeleted = statusResult.deletedCount + greetingsResult.deletedCount
    console.log(`🧹 Очищено ${totalDeleted} старих записів`)
    
    return totalDeleted
  } catch (error) {
    console.error('❌ Помилка очищення старих генерацій:', error)
    return 0
  }
}

// Для реального подключения к MongoDB используйте mongoose:

/*
import mongoose from 'mongoose'

const greetingSchema = new mongoose.Schema({
  recipientName: { type: String, required: true },
  occasion: { type: String, required: true },
  relationship: { type: String, required: true },
  personalDetails: String,
  musicStyle: { type: String, required: true },
  mood: { type: String, required: true },
  greetingLanguage: { type: String, required: true },
  text: { type: String, required: true },
  plan: { type: String, enum: ['basic', 'premium'], required: true },
  totalPrice: { type: Number, required: true },
  paymentMethod: { type: String, required: true },
  musicUrl: String,
  coverUrl: String,
  userId: { type: String, required: true },
  allowSharing: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

const GreetingModel = mongoose.model('Greeting', greetingSchema)

export async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI)
    console.log('Підключено до MongoDB')
  } catch (error) {
    console.error('Помилка підключення до MongoDB:', error)
    throw error
  }
}

export async function saveGreeting(greetingData: any): Promise<Greeting> {
  try {
    const greeting = new GreetingModel(greetingData)
    const savedGreeting = await greeting.save()
    return savedGreeting.toObject()
  } catch (error) {
    console.error('Помилка збереження привітання:', error)
    throw new Error('Не вдалося зберегти привітання')
  }
}

export async function getUserGreetings(userId: string): Promise<Greeting[]> {
  try {
    const greetings = await GreetingModel.find({ userId }).sort({ createdAt: -1 })
    return greetings.map(g => g.toObject())
  } catch (error) {
    console.error('Помилка отримання привітань:', error)
    throw new Error('Не вдалося отримати привітання')
  }
}
*/ 