require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb')

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/spivanka'

async function addTextBlocks() {
  const client = new MongoClient(MONGODB_URI)
  
  try {
    await client.connect()
    console.log('✅ Подключение к MongoDB установлено')
    
    const db = client.db()
    const textBlocksCollection = db.collection('textBlocks')
    
    // Очищаем существующие блоки
    await textBlocksCollection.deleteMany({})
    console.log('🗑️ Существующие текстовые блоки удалены')
    
    // Добавляем новые блоки
    const textBlocks = [
      {
        key: 'uniqueMusic',
        title: 'Унікальна музика',
        description: 'Suno AI генерує повні музичні композиції (~2 хв) протягом 1-3 хвилин',
        icon: '🎼',
        order: 1,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        key: 'personalText',
        title: 'Персональний текст',
        description: 'AI створює унікальні тексти привітань на основі ваших деталей',
        icon: '✍️',
        order: 2,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        key: 'beautifulCover',
        title: 'Красива обкладинка',
        description: 'Автоматично генерується обкладинка для вашого музичного привітання',
        icon: '🎨',
        order: 3,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        key: 'fastDelivery',
        title: 'Швидка доставка',
        description: 'Отримайте готове привітання за 5-10 хвилин після оплати',
        icon: '⚡',
        order: 4,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        key: 'highQuality',
        title: 'Висока якість',
        description: 'Професійна якість звуку та тексту для вашого особливого дня',
        icon: '⭐',
        order: 5,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]
    
    const result = await textBlocksCollection.insertMany(textBlocks)
    console.log(`✅ Добавлено ${result.insertedCount} текстовых блоков:`)
    
    textBlocks.forEach((block, index) => {
      console.log(`  ${index + 1}. ${block.title} (${block.key})`)
    })
    
  } catch (error) {
    console.error('❌ Ошибка:', error)
  } finally {
    await client.close()
    console.log('🔌 Соединение с MongoDB закрыто')
  }
}

addTextBlocks() 