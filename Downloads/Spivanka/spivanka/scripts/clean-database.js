require('dotenv').config({ path: '.env.local' })
const { MongoClient } = require('mongodb')

// Подключение к MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://seobohdanov:Qjr5xqHKNGcQJXqe@cluster0.uuhft.mongodb.net/spivanka?retryWrites=true&w=majority&appName=Cluster0'

async function cleanDatabase() {
  const client = new MongoClient(MONGODB_URI)
  
  try {
    await client.connect()
    console.log('✅ Підключено до MongoDB')
    
    const db = client.db()
    
    // Показываем текущую статистику
    console.log('\n📊 Поточна статистика бази даних:')
    
    const collections = ['greetings', 'generation_status', 'payments', 'settings', 'suno_callbacks']
    const stats = {}
    
    for (const collectionName of collections) {
      try {
        const count = await db.collection(collectionName).countDocuments()
        stats[collectionName] = count
        console.log(`   ${collectionName}: ${count} документів`)
      } catch (error) {
        stats[collectionName] = 0
        console.log(`   ${collectionName}: 0 документів (колекція не існує)`)
      }
    }
    
    console.log('\n🤔 Що ви хочете очистити?')
    console.log('1. Тільки тестові дані (привітання та статуси генерації)')
    console.log('2. Все крім налаштувань (залишити settings)')
    console.log('3. Повна очистка (ВСЕ, включаючи налаштування)')
    console.log('4. Тільки незавершені генерації (статус != SUCCESS)')
    console.log('5. Тільки старі дані (старше 7 днів)')
    console.log('6. Показати детальну статистику і вийти')
    
    // Получаем выбор пользователя из аргументов командной строки
    const choice = process.argv[2] || '6'
    
    switch (choice) {
      case '1':
        await cleanTestData(db, stats)
        break
      case '2':
        await cleanAllExceptSettings(db, stats)
        break
      case '3':
        await fullClean(db, stats)
        break
      case '4':
        await cleanIncompleteGenerations(db, stats)
        break
      case '5':
        await cleanOldData(db, stats)
        break
      case '6':
        await showDetailedStats(db)
        break
      default:
        console.log('❌ Невірний вибір. Використовуйте: node scripts/clean-database.js [1-6]')
        process.exit(1)
    }
    
  } catch (error) {
    console.error('❌ Помилка:', error)
  } finally {
    await client.close()
    console.log('✅ З\'єднання з MongoDB закрито')
  }
}

async function cleanTestData(db, stats) {
  console.log('\n🧹 Очищення тестових даних...')
  
  try {
    // Удаляем привітання та статуси генерації
    const [greetingsResult, statusResult, callbacksResult] = await Promise.all([
      db.collection('greetings').deleteMany({}),
      db.collection('generation_status').deleteMany({}),
      db.collection('suno_callbacks').deleteMany({})
    ])
    
    console.log(`✅ Видалено ${greetingsResult.deletedCount} привітань`)
    console.log(`✅ Видалено ${statusResult.deletedCount} статусів генерації`)
    console.log(`✅ Видалено ${callbacksResult.deletedCount} callback\'ів`)
    console.log('✅ Тестові дані очищено! Налаштування та платежі збережено.')
    
  } catch (error) {
    console.error('❌ Помилка очищення тестових даних:', error)
  }
}

async function cleanAllExceptSettings(db, stats) {
  console.log('\n🧹 Очищення всього крім налаштувань...')
  
  try {
    const [greetingsResult, statusResult, paymentsResult, callbacksResult] = await Promise.all([
      db.collection('greetings').deleteMany({}),
      db.collection('generation_status').deleteMany({}),
      db.collection('payments').deleteMany({}),
      db.collection('suno_callbacks').deleteMany({})
    ])
    
    console.log(`✅ Видалено ${greetingsResult.deletedCount} привітань`)
    console.log(`✅ Видалено ${statusResult.deletedCount} статусів генерації`)
    console.log(`✅ Видалено ${paymentsResult.deletedCount} платежів`)
    console.log(`✅ Видалено ${callbacksResult.deletedCount} callback\'ів`)
    console.log('✅ Все очищено крім налаштувань!')
    
  } catch (error) {
    console.error('❌ Помилка очищення:', error)
  }
}

async function fullClean(db, stats) {
  console.log('\n🧹 ПОВНА ОЧИСТКА БАЗИ ДАНИХ...')
  console.log('⚠️  ЦЕ ВИДАЛИТЬ ВСЕ, ВКЛЮЧАЮЧИ НАЛАШТУВАННЯ АДМІНА!')
  
  try {
    const collections = ['greetings', 'generation_status', 'payments', 'settings', 'suno_callbacks']
    const results = {}
    
    for (const collectionName of collections) {
      try {
        const result = await db.collection(collectionName).deleteMany({})
        results[collectionName] = result.deletedCount
        console.log(`✅ Видалено ${result.deletedCount} документів з ${collectionName}`)
      } catch (error) {
        console.log(`⚠️  Колекція ${collectionName} не існує або помилка: ${error.message}`)
      }
    }
    
    console.log('✅ Повна очистка завершена!')
    
  } catch (error) {
    console.error('❌ Помилка повної очистки:', error)
  }
}

async function cleanIncompleteGenerations(db, stats) {
  console.log('\n🧹 Очищення незавершених генерацій...')
  
  try {
    const incompleteStatuses = ['PENDING', 'TEXT_SUCCESS', 'FIRST_SUCCESS', 'ERROR', 'FAILED']
    
    const [greetingsResult, statusResult] = await Promise.all([
      db.collection('greetings').deleteMany({
        status: { $in: incompleteStatuses }
      }),
      db.collection('generation_status').deleteMany({
        status: { $in: incompleteStatuses }
      })
    ])
    
    console.log(`✅ Видалено ${greetingsResult.deletedCount} незавершених привітань`)
    console.log(`✅ Видалено ${statusResult.deletedCount} незавершених статусів`)
    console.log('✅ Незавершені генерації очищено!')
    
  } catch (error) {
    console.error('❌ Помилка очищення незавершених генерацій:', error)
  }
}

async function cleanOldData(db, stats) {
  console.log('\n🧹 Очищення старих даних (старше 7 днів)...')
  
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    
    const [greetingsResult, statusResult, callbacksResult] = await Promise.all([
      db.collection('greetings').deleteMany({
        createdAt: { $lt: sevenDaysAgo }
      }),
      db.collection('generation_status').deleteMany({
        createdAt: { $lt: sevenDaysAgo }
      }),
      db.collection('suno_callbacks').deleteMany({
        receivedAt: { $lt: sevenDaysAgo }
      })
    ])
    
    console.log(`✅ Видалено ${greetingsResult.deletedCount} старих привітань`)
    console.log(`✅ Видалено ${statusResult.deletedCount} старих статусів`)
    console.log(`✅ Видалено ${callbacksResult.deletedCount} старих callback\'ів`)
    console.log('✅ Старі дані очищено!')
    
  } catch (error) {
    console.error('❌ Помилка очищення старих даних:', error)
  }
}

async function showDetailedStats(db) {
  console.log('\n📊 Детальна статистика бази даних:')
  
  try {
    // Статистика привітань
    const greetingsStats = await db.collection('greetings').aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]).toArray()
    
    console.log('\n🎵 Привітання по статусах:')
    greetingsStats.forEach(stat => {
      console.log(`   ${stat._id || 'undefined'}: ${stat.count}`)
    })
    
    // Статистика по користувачах
    const userCount = await db.collection('greetings').distinct('userId')
    console.log(`\n👥 Унікальних користувачів: ${userCount.length}`)
    
    // Статистика платежів
    const paymentsStats = await db.collection('payments').aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]).toArray()
    
    console.log('\n💰 Платежі по статусах:')
    paymentsStats.forEach(stat => {
      console.log(`   ${stat._id || 'undefined'}: ${stat.count} платежів, сума: ${stat.totalAmount || 0} ₴`)
    })
    
    // Публічні привітання
    const publicGreetings = await db.collection('greetings').countDocuments({
      $or: [
        { allowSharing: true },
        { makePublic: true }
      ]
    })
    console.log(`\n🌐 Публічних привітань: ${publicGreetings}`)
    
    // Налаштування
    const settings = await db.collection('settings').findOne({ type: 'app' })
    console.log('\n⚙️  Налаштування додатка:')
    if (settings) {
      console.log(`   Назва: ${settings.data?.appName || 'Spivanka'}`)
      console.log(`   Базовий план: ${settings.data?.basicPlanPrice || 100} ₴`)
      console.log(`   Преміум план: ${settings.data?.premiumPlanPrice || 200} ₴`)
      console.log(`   Режим обслуговування: ${settings.data?.maintenanceMode ? 'ТАК' : 'НІ'}`)
    } else {
      console.log('   Налаштування не знайдено (використовуються дефолтні)')
    }
    
  } catch (error) {
    console.error('❌ Помилка отримання статистики:', error)
  }
}

// Запускаем скрипт
cleanDatabase().catch(console.error)
