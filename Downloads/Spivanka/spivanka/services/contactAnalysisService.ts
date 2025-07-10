// Отдельный сервис для анализа контактов и определения родственных связей

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY
const GEMINI_API_URL = process.env.NEXT_PUBLIC_GEMINI_API_URL

// Интерфейс для результата анализа контакта
export interface ContactAnalysisResult {
  isRelative: boolean
  relationship?: string
  recipientName?: string
}

// Функция для очистки имени от лишних частей
function cleanContactName(name: string): string {
  // Убираем "– день народження", "- день рождения", "– birthday" и подобное
  const cleaned = name
    .replace(/\s*[–-]\s*(день народження|день рождения|birthday|др\.?|днем народження).*$/i, '')
    .trim()
  
  console.log('🧹 Очистка имени:', { original: name, cleaned })
  return cleaned || name // Если после очистки пусто, возвращаем оригинал
}

// Функция для очистки JSON ответа от markdown форматирования
function cleanJsonResponse(response: string): string {
  let cleaned = response.trim()
  
  // Убираем markdown блоки
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '')
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '')
  }
  
  return cleaned.trim()
}

// Функция для выполнения запроса к Gemini (копия из geminiService)
async function performContactAnalysisRequest(prompt: string): Promise<string> {
  try {
    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: prompt
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.3, // Низкая температура для более точных результатов
        topK: 20,
        topP: 0.8,
        maxOutputTokens: 2048, // Увеличиваем лимит для пакетного анализа
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        }
      ]
    }

    console.log('📤 Отправляю запрос анализа контакта к Gemini API...')

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    })

    console.log(`📡 Ответ от Gemini API (анализ контакта): ${response.status} ${response.statusText}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ Gemini API ошибка анализа контакта: ${response.status} - ${errorText}`)
      throw new Error(`Ошибка API анализа контакта: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    console.log('📋 Ответ от Gemini API (анализ контакта):', JSON.stringify(data, null, 2))
    
    // Проверяем наличие candidates
    if (!data.candidates || !Array.isArray(data.candidates) || data.candidates.length === 0) {
      console.error('❌ Нет candidates в ответе Gemini API')
      throw new Error('Нет candidates в ответе Gemini API')
    }
    
    // Извлекаем текст ответа
    let generatedText = ''
    if (
      data.candidates &&
      Array.isArray(data.candidates) &&
      data.candidates.length > 0 &&
      data.candidates[0]
    ) {
      const candidate = data.candidates[0]
      
      // Проверяем причину завершения
      if (candidate.finishReason === 'SAFETY') {
        console.log('⚠️ Контент заблокирован по соображениям безопасности')
        throw new Error('Контент заблокирован по соображениям безопасности')
      }
      
      if (candidate.finishReason === 'MAX_TOKENS') {
        console.log('⚠️ Ответ обрезан из-за превышения лимита токенов')
        throw new Error('Ответ обрезан из-за превышения лимита токенов')
      }
      
      if (
        candidate.content &&
        candidate.content.parts &&
        Array.isArray(candidate.content.parts) &&
        candidate.content.parts.length > 0 &&
        candidate.content.parts[0] &&
        typeof candidate.content.parts[0].text === 'string'
      ) {
        generatedText = candidate.content.parts[0].text.trim()
      }
    }
    
    if (generatedText) {
      console.log('✅ Анализ контакта выполнен успешно, получен текст:', generatedText.substring(0, 100) + '...')
      return generatedText
    } else {
      console.error('❌ Неожиданный ответ от Gemini API при анализе контакта:', JSON.stringify(data, null, 2))
      throw new Error('Неожиданный ответ от Gemini API: отсутствует текст анализа')
    }
  } catch (error) {
    console.error('❌ Ошибка анализа контакта:', error)
    throw error
  }
}

// Функция для анализа контакта: определение родственных связей
export async function analyzeContact(contactName: string): Promise<ContactAnalysisResult> {
  if (!GEMINI_API_KEY || !GEMINI_API_URL) {
    console.error('❌ Gemini API не настроен для анализа контактов')
    return { isRelative: false, recipientName: contactName }
  }

  // Очищаем имя перед анализом
  const cleanedName = cleanContactName(contactName)

  const prompt = `
Проанализируй имя контакта и определи, является ли это родственной связью:

Имя контакта: "${cleanedName}"

РОДСТВЕННЫЕ СВЯЗИ (если найдено - возвращай isRelative: true):
- Тато: папа, тато, тата, батько, отец, папочка, папуля
- Мама: мама, мати, мамочка, мамуля, мать, мамка
- Брат: брат, братик, братишка, бро
- Сестра: сестра, сестричка, сестрёнка
- Син: син, сын, сынок, сынуля, сынишка
- Дочка: дочка, дочь, доченька, дочурка, донька
- Дружина: дружина, жена, жёнушка, супруга
- Чоловік: чоловік, муж, мужик, супруг
- Друг: друг, дружок, товарищ, приятель
- Подруга: подруга, подружка, приятельница
- Колега: колега, коллега, сослуживец
- Інше: дедушка, дідусь, бабушка, бабуся, тетя, дядя, племянник, племянница

Верни результат ТОЛЬКО в формате JSON:
{
  "isRelative": true/false,
  "relationship": "Тип связи" (только если isRelative = true),
  "recipientName": "Исходное имя" (только если isRelative = false)
}

Примеры:
- "Папа" → {"isRelative": true, "relationship": "Тато"}
- "Мамочка" → {"isRelative": true, "relationship": "Мама"}
- "Вася" → {"isRelative": false, "recipientName": "Вася"}
- "Анна" → {"isRelative": false, "recipientName": "Анна"}
- "My Love ❤️" → {"isRelative": false, "recipientName": "My Love ❤️"}
- "Максим" → {"isRelative": false, "recipientName": "Максим"}
`

  try {
    const response = await performContactAnalysisRequest(prompt)
    const cleanedResponse = cleanJsonResponse(response)
    
    try {
      const result = JSON.parse(cleanedResponse)
      console.log('🤖 Gemini проанализировал контакт:', { contactName, cleanedName, result })
      return result
    } catch (parseError) {
      console.error('❌ Ошибка парсинга JSON ответа:', parseError)
      console.error('📄 Очищенный ответ:', cleanedResponse)
      throw parseError
    }
  } catch (error) {
    console.error('❌ Ошибка анализа контакта через Gemini:', error)
    return { isRelative: false, recipientName: cleanedName }
  }
}

// Функция для пакетного анализа контактов: определение родственных связей
export async function analyzeBatchContacts(contacts: string[]): Promise<Record<string, ContactAnalysisResult>> {
  if (!GEMINI_API_KEY || !GEMINI_API_URL) {
    console.error('❌ Gemini API не настроен для анализа контактов')
    const result: Record<string, ContactAnalysisResult> = {}
    contacts.forEach(contact => {
      result[contact] = { isRelative: false, recipientName: contact }
    })
    return result
  }

  if (contacts.length === 0) {
    return {}
  }

  console.log(`🤖 Пакетный анализ ${contacts.length} контактов через Gemini...`)

  // Ограничиваем количество контактов в одном запросе
  const MAX_CONTACTS_PER_BATCH = 10
  if (contacts.length > MAX_CONTACTS_PER_BATCH) {
    console.log(`⚠️ Слишком много контактов (${contacts.length}), обрабатываю по ${MAX_CONTACTS_PER_BATCH} за раз`)
    
    const result: Record<string, ContactAnalysisResult> = {}
    for (let i = 0; i < contacts.length; i += MAX_CONTACTS_PER_BATCH) {
      const batch = contacts.slice(i, i + MAX_CONTACTS_PER_BATCH)
      const batchResult = await analyzeBatchContacts(batch)
      Object.assign(result, batchResult)
    }
    return result
  }

  // Очищаем все имена перед анализом
  const cleanedContacts = contacts.map(contact => cleanContactName(contact))
  const contactsList = cleanedContacts.map((contact, index) => `${index + 1}. "${contact}"`).join('\n')

  const prompt = `
Анализ контактов на родственные связи:

${contactsList}

Родственники:
- Тато: папа, тато, батько, отец, папочка
- Мама: мама, мати, мамочка, мамуля, мать
- Брат: брат, братик, бро
- Сестра: сестра, сестричка
- Син: син, сын, сынок
- Дочка: дочка, дочь, донька
- Дружина: дружина, жена, супруга
- Чоловік: чоловік, муж, супруг
- Друг: друг, товарищ
- Подруга: подруга, приятельница
- Інше: дедушка, бабушка, тетя, дядя

JSON ответ:
{
  "Папа": {"isRelative": true, "relationship": "Тато"},
  "Вася": {"isRelative": false, "recipientName": "Вася"}
}
`

  try {
    const response = await performContactAnalysisRequest(prompt)
    const cleanedResponse = cleanJsonResponse(response)
    
    let result
    try {
      result = JSON.parse(cleanedResponse)
    } catch (parseError) {
      console.error('❌ Ошибка парсинга JSON ответа:', parseError)
      console.error('📄 Очищенный ответ:', cleanedResponse)
      throw parseError
    }
    
    console.log(`🤖 Gemini проанализировал ${cleanedContacts.length} контактов пакетно:`, result)
    
    // Преобразуем результат обратно к оригинальным именам
    const finalResult: Record<string, ContactAnalysisResult> = {}
    contacts.forEach((originalContact, index) => {
      const cleanedContact = cleanedContacts[index]
      if (result[cleanedContact]) {
        finalResult[originalContact] = result[cleanedContact]
      } else {
        finalResult[originalContact] = { isRelative: false, recipientName: cleanedContact }
      }
    })
    
    return finalResult
  } catch (error) {
    console.error('❌ Ошибка пакетного анализа контактов через Gemini:', error)
    
    // Если ошибка связана с превышением лимита токенов, попробуем уменьшить пакет
    if (error instanceof Error && error.message.includes('превышения лимита токенов') && contacts.length > 5) {
      console.log('🔄 Попытка анализа с меньшим пакетом (5 контактов)')
      const result: Record<string, ContactAnalysisResult> = {}
      for (let i = 0; i < contacts.length; i += 5) {
        const batch = contacts.slice(i, i + 5)
        try {
          const batchResult = await analyzeBatchContacts(batch)
          Object.assign(result, batchResult)
        } catch (batchError) {
          console.error(`❌ Ошибка анализа пакета ${i + 1}-${i + batch.length}:`, batchError)
          // Добавляем как обычные контакты
          batch.forEach(contact => {
            const cleanedName = cleanContactName(contact)
            result[contact] = { isRelative: false, recipientName: cleanedName }
          })
        }
      }
      return result
    }
    
    // Возвращаем fallback результат с очищенными именами
    const result: Record<string, ContactAnalysisResult> = {}
    contacts.forEach(contact => {
      const cleanedName = cleanContactName(contact)
      result[contact] = { isRelative: false, recipientName: cleanedName }
    })
    return result
  }
} 