import { FormData } from '@/types'

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY
const GEMINI_API_URL = process.env.NEXT_PUBLIC_GEMINI_API_URL

export async function generateGreetingText(formData: FormData): Promise<string> {
  if (!GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY не налаштований')
    throw new Error('GEMINI_API_KEY не налаштований')
  }
  if (!GEMINI_API_URL) {
    console.error('❌ GEMINI_API_URL не налаштований')
    throw new Error('GEMINI_API_URL не налаштований')
  }

  console.log('🔑 GEMINI_API_KEY налаштований:', GEMINI_API_KEY.substring(0, 10) + '...')
  console.log('🌐 GEMINI_API_URL:', GEMINI_API_URL)

  const prompt = createPrompt(formData)
  console.log('📝 Prompt для Gemini:', prompt.substring(0, 200) + '...')

  // Функция для выполнения запроса с повторными попытками
  const makeRequest = async (attempt: number = 1): Promise<string> => {
    const maxAttempts = 3
    const baseDelay = 2000 // 2 секунды

    try {
      return await performGeminiRequest(prompt)
    } catch (error) {
      if (error instanceof Error && error.message.includes('перевантажений') && attempt < maxAttempts) {
        const delay = baseDelay * attempt
        console.log(`🔄 Спроба ${attempt} невдала, чекаю ${delay}ms перед повторною спробою...`)
        await new Promise(resolve => setTimeout(resolve, delay))
        return makeRequest(attempt + 1)
      }
      throw error
    }
  }

  return makeRequest()
}

async function performGeminiRequest(prompt: string): Promise<string> {
  
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
        temperature: 0.8,
        topK: 40,
        topP: 0.95,
        // Увеличиваем лимит токенов для обработки больших контекстов
        // и создания более детальных песен
        maxOutputTokens: 8192,
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

    console.log('📤 Відправляю запит до Gemini API...')
    console.log('📋 Request body:', JSON.stringify(requestBody, null, 2))

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    })

    console.log(`📡 Відповідь від Gemini API: ${response.status} ${response.statusText}`)
    console.log('📋 Response headers:', Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ Gemini API помилка: ${response.status} - ${errorText}`)
      
      // Анализируем различные ошибки
      if (response.status === 429) {
        console.error('🚫 Rate limit досягнуто для Gemini API')
        console.error('💡 Можливі причини:')
        console.error('   - Перевищено ліміт запитів на хвилину')
        console.error('   - Перевищено ліміт запитів на день')
        console.error('   - Неправильний API ключ')
        console.error('   - Неправильний URL API')
        throw new Error('Забагато запитів до API. Зачекайте трохи і спробуйте знову.')
      } else if (response.status === 503) {
        console.error('🚫 Сервер Gemini перевантажений')
        console.error('💡 Можливі причини:')
        console.error('   - Сервер Gemini тимчасово недоступний')
        console.error('   - Висока навантаженість на сервері')
        console.error('   - Технічні роботи')
        throw new Error('Сервер генерації тимчасово перевантажений. Спробуйте через кілька хвилин.')
      } else if (response.status === 500) {
        console.error('🚫 Внутрішня помилка сервера Gemini')
        throw new Error('Внутрішня помилка сервера генерації. Спробуйте пізніше.')
      } else if (response.status === 400) {
        console.error('🚫 Помилка в запиті до Gemini API')
        throw new Error('Помилка в даних запиту. Перевірте форму і спробуйте знову.')
      }
      
      throw new Error(`Помилка API: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    console.log('📋 Відповідь від Gemini API:', data)
    
    // Универсальный парсер для разных моделей Gemini
    let generatedText = ''
    let finishReason = ''
    if (
      data.candidates &&
      Array.isArray(data.candidates) &&
      data.candidates.length > 0 &&
      data.candidates[0]
    ) {
      const candidate = data.candidates[0]
      finishReason = candidate.finishReason || ''
      // Новый формат (2.5): content.parts[0].text
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
      // Старый формат: content.text
      else if (
        candidate.content &&
        typeof candidate.content.text === 'string'
      ) {
        generatedText = candidate.content.text.trim()
      }
      // Иногда текст может быть прямо в candidate.text
      else if (typeof candidate.text === 'string') {
        generatedText = candidate.text.trim()
      }
    }
    if (generatedText) {
      console.log('✅ Текст згенеровано успішно, довжина:', generatedText.length)
      
      // Очищаем текст от лишних комментариев
      const cleanedText = cleanGeneratedText(generatedText)
      console.log('🧹 Текст очищено від коментарів, нова довжина:', cleanedText.length)
      
      return cleanedText
    } else {
      let reasonMsg = ''
      if (finishReason === 'MAX_TOKENS') {
        reasonMsg = 'Модель досягла ліміту токенів. Спробуйте скоротити prompt або збільшити maxOutputTokens.'
      } else if (finishReason) {
        reasonMsg = `Причина завершення: ${finishReason}`
      } else {
        reasonMsg = 'Модель не повернула текст. Можливо, проблема з prompt або параметрами.'
      }
      console.error('❌ Неочікувана відповідь від Gemini API:', data)
      throw new Error('Неочікувана відповідь від Gemini API: відсутній текст. ' + reasonMsg)
    }
  } catch (error) {
    console.error('❌ Помилка генерації тексту:', error)
    throw error
  }
}

function createPrompt(formData: FormData): string {
  const languageMap: { [key: string]: string } = {
    'uk': 'українською мовою',
    'ru': 'российским языком',
    'en': 'англійською мовою',
    'pl': 'польською мовою',
    'de': 'німецькою мовою',
    'cz': 'чеською мовою',
    'ro': 'румунською мовою',
    'sk': 'словацькою мовою',
    'hu': 'угорською мовою',
    'it': 'італійською мовою',
    'fr': 'французькою мовою',
    'hr': 'хорватською мовою',
    'pt': 'португальською мовою',
    'es': 'іспанською мовою'
  }

  const moodMap: { [key: string]: string } = {
    'joyful': 'радісний та святковий',
    'tender': 'ніжний та теплий',
    'solemn': 'урочистий та значущий',
    'energetic': 'енергійний та динамічний'
  }

  const relationshipMap: { [key: string]: string } = {
    'Мама': 'матері',
    'Тато': 'батьку',
    'Дружина': 'дружині',
    'Чоловік': 'чоловіку',
    'Син': 'сину',
    'Дочка': 'дочці',
    'Брат': 'брату',
    'Сестра': 'сестрі',
    'Друг': 'другу',
    'Подруга': 'подрузі',
    'Колега': 'колезі'
  }

  // Создаем русские версии для русского языка
  const russianMoodMap: { [key: string]: string } = {
    'joyful': 'радостный и праздничный',
    'tender': 'нежный и теплый',
    'solemn': 'торжественный и значимый',
    'energetic': 'энергичный и динамичный'
  }

  // Проверяем, является ли браузер русским (если доступно)
  const isRussianBrowser = typeof window !== 'undefined' && 
    (navigator.language?.startsWith('ru') || navigator.languages?.some(lang => lang.startsWith('ru')))

  const russianRelationshipMap: { [key: string]: string } = {
    'Мама': 'мамы',
    'Тато': 'папы',
    'Дружина': 'жены',
    'Чоловік': 'мужа',
    'Син': 'сына',
    'Дочка': 'дочери',
    'Брат': 'брата',
    'Сестра': 'сестры',
    'Друг': 'друга',
    'Подруга': 'подруги',
    'Колега': 'коллеги'
  }

  // Карты музыкальных жанров
  const genreMap: { [key: string]: { uk: string, ru: string, structure: string, style: string } } = {
    'pop': {
      uk: 'поп',
      ru: 'поп',
      structure: '[verse] - [chorus] - [verse] - [chorus] - [bridge] - [chorus]',
      style: 'catchy, melodic, with memorable hooks'
    },
    'rock': {
      uk: 'рок',
      ru: 'рок',
      structure: '[verse] - [chorus] - [verse] - [chorus] - [bridge] - [chorus]',
      style: 'powerful, energetic, with strong rhythm'
    },
    'jazz': {
      uk: 'джаз',
      ru: 'джаз',
      structure: '[verse] - [chorus] - [verse] - [chorus] - [bridge] - [chorus]',
      style: 'smooth, sophisticated, with complex harmonies'
    },
    'ballad': {
      uk: 'балада',
      ru: 'баллада',
      structure: '[verse] - [chorus] - [verse] - [chorus] - [bridge] - [chorus]',
      style: 'emotional, slow, with deep lyrics'
    },
    'folk': {
      uk: 'фольк',
      ru: 'фолк',
      structure: '[verse] - [chorus] - [verse] - [chorus] - [bridge] - [chorus]',
      style: 'traditional, storytelling, with acoustic feel'
    },
    'country': {
      uk: 'кантрі',
      ru: 'кантри',
      structure: '[verse] - [chorus] - [verse] - [chorus] - [bridge] - [chorus]',
      style: 'down-to-earth, narrative, with country themes'
    },
    'electronic': {
      uk: 'електронна музика',
      ru: 'электронная музыка',
      structure: '[verse] - [chorus] - [verse] - [chorus] - [bridge] - [chorus]',
      style: 'modern, danceable, with synthesizers'
    },
    'reggae': {
      uk: 'реггі',
      ru: 'регги',
      structure: '[verse] - [chorus] - [verse] - [chorus] - [bridge] - [chorus]',
      style: 'relaxed, rhythmic, with positive energy'
    },
    'blues': {
      uk: 'блюз',
      ru: 'блюз',
      structure: '[verse] - [chorus] - [verse] - [chorus] - [bridge] - [chorus]',
      style: 'soulful, melancholic, with emotional vocals'
    },
    'funk': {
      uk: 'фанк',
      ru: 'фанк',
      structure: '[verse] - [chorus] - [verse] - [chorus] - [bridge] - [chorus]',
      style: 'groovy, rhythmic, with bass lines'
    }
  }

  // Карта стилей артистов
  const artistStyleMap: { [key: string]: { uk: string, ru: string, style: string, voiceType: string } } = {
    // Украинские артисты (скорочені до 180 символів)
    'okean_elzy': { 
      uk: 'альтернативний рок у стилі Океан Ельзи', 
      ru: 'альтернативный рок в стиле Океан Эльзи', 
      style: 'rock, alternative rock, indie rock, warm voice, raspy voice, baritone voice, emotional voice, melodic voice, powerful voice, Ukrainian', 
      voiceType: 'male' 
    },
    'svyatoslav_vakarchuk': { 
      uk: 'рок у стилі Святослава Вакарчука', 
      ru: 'рок в стиле Святослава Вакарчука', 
      style: 'rock, alternative rock, patriotic rock, warm voice, raspy voice, baritone voice, emotional voice, powerful voice, Ukrainian male vocals', 
      voiceType: 'male' 
    },
    'jamala': { 
      uk: 'етно-поп у стилі Джамали', 
      ru: 'этно-поп в стиле Джамалы', 
      style: 'ethno-pop, world music, jazz influences, soulful voice, emotional female vocals, powerful voice, expressive voice, melismatic voice, Ukrainian', 
      voiceType: 'female' 
    },
    'tina_karol': { 
      uk: 'поп у стилі Тіни Кароль', 
      ru: 'поп в стиле Тины Кароль', 
      style: 'pop, dance pop, europop, energetic, bright voice, clear voice, soprano voice, melodic voice, catchy voice, expressive voice, female vocals', 
      voiceType: 'female' 
    },
    'verka_serduchka': { 
      uk: 'євроденс у стилі Верки Сердючки', 
      ru: 'евроданс в стиле Верки Сердючки', 
      style: 'eurodance, fun, theatrical, comedic voice, energetic voice, catchy voice, dance music, Ukrainian', 
      voiceType: 'male' 
    },
    
    // Международные поп-артисты (скорочені)
    'taylor_swift': { 
      uk: 'поп у стилі Тейлор Свіфт', 
      ru: 'поп в стиле Тейлор Свифт', 
      style: 'pop, alternative folk, emotional, female vocals, storytelling voice, melodic voice, expressive voice, clear voice', 
      voiceType: 'female' 
    },
    'ed_sheeran': { 
      uk: 'фолк-поп у стилі Еда Ширана', 
      ru: 'фолк-поп в стиле Эда Ширана', 
      style: 'folk-pop, acoustic guitar loops, male vocals, warm voice, melodic voice, storytelling voice, soft voice', 
      voiceType: 'male' 
    },
    'adele': { 
      uk: 'соул у стилі Адель', 
      ru: 'соул в стиле Адель', 
      style: 'soul, pop ballads, powerful female vocals, emotional voice, rich voice, expressive voice, melismatic voice', 
      voiceType: 'female' 
    },
    'billie_eilish': { 
      uk: 'альтернативний поп у стилі Біллі Айліш', 
      ru: 'альтернативный поп в стиле Билли Айлиш', 
      style: 'alternative pop, dark pop, whisper vocals, female vocals, breathy voice, intimate voice, unique voice', 
      voiceType: 'female' 
    },
    'ariana_grande': { 
      uk: 'поп у стилі Аріани Гранде', 
      ru: 'поп в стиле Арианы Гранде', 
      style: 'pop, R&B, powerful female vocals, soprano voice, melismatic voice, expressive voice, clear voice', 
      voiceType: 'female' 
    },
    'justin_bieber': { 
      uk: 'поп у стилі Джастіна Бібера', 
      ru: 'поп в стиле Джастина Бибера', 
      style: 'pop, R&B, male vocals, smooth voice, melodic voice, contemporary voice, expressive voice', 
      voiceType: 'male' 
    },
    'bruno_mars': { 
      uk: 'фанк-поп у стилі Бруно Марса', 
      ru: 'фанк-поп в стиле Бруно Марса', 
      style: 'pop, funk, soul, male vocals, smooth voice, energetic voice, versatile voice, charismatic voice', 
      voiceType: 'male' 
    },
    'dua_lipa': { 
      uk: 'диско-поп у стилі Дуа Ліпи', 
      ru: 'диско-поп в стиле Дуа Липы', 
      style: 'dance-pop, disco-pop, female vocals, clear voice, melodic voice, catchy voice, modern voice', 
      voiceType: 'female' 
    },
    
    // Рок артисты (скорочені)
    'coldplay': { 
      uk: 'альтернативний рок у стилі Coldplay', 
      ru: 'альтернативный рок в стиле Coldplay', 
      style: 'alternative rock, pop rock, atmospheric, male vocals, emotional voice, melodic voice, anthemic voice', 
      voiceType: 'male' 
    },
    'imagine_dragons': { 
      uk: 'альтернативний рок у стилі Imagine Dragons', 
      ru: 'альтернативный рок в стиле Imagine Dragons', 
      style: 'alternative rock, pop rock, energetic, male vocals, powerful voice, dynamic voice, modern rock', 
      voiceType: 'male' 
    },
    'queen': { 
      uk: 'рок у стилі Queen', 
      ru: 'рок в стиле Queen', 
      style: 'rock, operatic rock, theatrical, male vocals, powerful voice, dramatic voice, iconic voice', 
      voiceType: 'male' 
    },
    'the_beatles': { 
      uk: 'рок у стилі The Beatles', 
      ru: 'рок в стиле The Beatles', 
      style: 'rock, pop rock, classic rock, male vocals, harmonious voices, melodic voice, timeless voice', 
      voiceType: 'male' 
    },
    
    // R&B/Soul артисты (скорочені)
    'beyonce': { 
      uk: 'R&B у стилі Бейонсе', 
      ru: 'R&B в стиле Бейонсе', 
      style: 'R&B, pop, soul, powerful female vocals, melismatic voice, expressive voice, dynamic voice', 
      voiceType: 'female' 
    },
    'john_legend': { 
      uk: 'соул у стилі Джона Леджента', 
      ru: 'соул в стиле Джона Ледженда', 
      style: 'R&B, soul, piano ballads, male vocals, smooth voice, emotional voice, soulful voice', 
      voiceType: 'male' 
    },
    'alicia_keys': { 
      uk: 'соул у стилі Алісії Кіз', 
      ru: 'соул в стиле Алисии Киз', 
      style: 'R&B, soul, neo-soul, female vocals, powerful voice, soulful voice, piano-driven', 
      voiceType: 'female' 
    },
    
    // Classic/Jazz артисты (скорочені)
    'frank_sinatra': { 
      uk: 'джаз у стилі Френка Сінатри', 
      ru: 'джаз в стиле Фрэнка Синатры', 
      style: 'jazz, traditional pop, swing, male vocals, smooth voice, crooner voice, classic voice', 
      voiceType: 'male' 
    },
    'ella_fitzgerald': { 
      uk: 'джаз у стилі Елли Фіцджеральд', 
      ru: 'джаз в стиле Эллы Фицджеральд', 
      style: 'jazz, swing, scat singing, female vocals, versatile voice, smooth voice, improvisational', 
      voiceType: 'female' 
    },
    'nat_king_cole': { 
      uk: 'джаз у стилі Нета Кінга Коула', 
      ru: 'джаз в стиле Нэта Кинга Коула', 
      style: 'jazz, traditional pop, smooth, male vocals, warm voice, intimate voice, classic voice', 
      voiceType: 'male' 
    }
  }

  // Карта типов голоса
  const voiceTypeMap: { [key: string]: { uk: string, ru: string, instruction: string } } = {
    'female': { 
      uk: 'жіночий голос', 
      ru: 'женский голос',
      instruction: '[Female Vocal]'
    },
    'male': { 
      uk: 'чоловічий голос', 
      ru: 'мужской голос',
      instruction: '[Male Vocal]'
    },
    'duet': { 
      uk: 'дуэт (чоловік + жінка)', 
      ru: 'дуэт (мужчина + женщина)',
      instruction: '[Duet]\n[Male Vocal]: ... \n[Female Vocal]: ...'
    }
  }

  // Карта дополнительных музыкальных тегов для разных жанров
  const genreMusicalTags: { [key: string]: string[] } = {
    'pop': ['[Catchy Hook]', '[Piano Solo]'],
    'rock': ['[Guitar Solo]', '[Catchy Hook]'],
    'jazz': ['[Piano Solo]', '[Guitar Solo]'],
    'ballad': ['[Piano Solo]', '[Whisper]'],
    'folk': ['[Guitar Solo]', '[Spoken Word]'],
    'country': ['[Guitar Solo]', '[Spoken Word]'],
    'electronic': ['[Catchy Hook]'],
    'reggae': ['[Guitar Solo]'],
    'blues': ['[Guitar Solo]', '[Piano Solo]'],
    'funk': ['[Guitar Solo]', '[Catchy Hook]']
  }

  // Карта дополнительных тегов для стилей артистов
  const artistMusicalTags: { [key: string]: string[] } = {
    'okean_elzy': ['[Guitar Solo]', '[Choir]'],
    'svyatoslav_vakarchuk': ['[Guitar Solo]', '[Choir]'],
    'jamala': ['[Piano Solo]', '[Choir]'],
    'tina_karol': ['[Catchy Hook]', '[Piano Solo]'],
    'verka_serduchka': ['[Catchy Hook]'],
    'taylor_swift': ['[Guitar Solo]', '[Piano Solo]'],
    'ed_sheeran': ['[Guitar Solo]'],
    'adele': ['[Piano Solo]', '[Whisper]'],
    'billie_eilish': ['[Whisper]'],
    'bruno_mars': ['[Catchy Hook]', '[Guitar Solo]'],
    'dua_lipa': ['[Catchy Hook]'],
    'coldplay': ['[Piano Solo]', '[Guitar Solo]'],
    'imagine_dragons': ['[Guitar Solo]', '[Choir]'],
    'queen': ['[Piano Solo]', '[Guitar Solo]', '[Choir]'],
    'the_beatles': ['[Guitar Solo]', '[Piano Solo]'],
    'beyonce': ['[Catchy Hook]', '[Choir]'],
    'john_legend': ['[Piano Solo]'],
    'alicia_keys': ['[Piano Solo]'],
    'frank_sinatra': ['[Piano Solo]', '[Spoken Word]'],
    'ella_fitzgerald': ['[Piano Solo]'],
    'nat_king_cole': ['[Piano Solo]']
  }

  // Выбираем карты в зависимости от языка
  const isRussian = formData.greetingLanguage === 'ru' && isRussianBrowser
  const currentMoodMap = isRussian ? russianMoodMap : moodMap
  const currentRelationshipMap = isRussian ? russianRelationshipMap : relationshipMap
  
  const language = isRussian ? 'российским языком' : (languageMap[formData.greetingLanguage] || 'українською мовою')
  
  const mood = currentMoodMap[formData.mood] || (isRussian ? 'теплый' : 'теплий')
  const relationship = currentRelationshipMap[formData.relationship] || formData.relationship.toLowerCase()

  // Определяем стиль музыки
  let genreName: string
  let genreStyle: string
  let musicStyleForSuno: string

  if (formData.useStarStyle && formData.artistStyle) {
    // Используем стиль артиста
    const artistInfo = artistStyleMap[formData.artistStyle]
    if (artistInfo) {
      genreName = isRussian ? artistInfo.ru : artistInfo.uk
      genreStyle = artistInfo.style
      musicStyleForSuno = artistInfo.style
    } else {
      // Fallback если артист не найден
      genreName = isRussian ? 'поп' : 'поп'
      genreStyle = 'pop, melodic, emotional'
      musicStyleForSuno = 'pop, melodic, emotional'
    }
  } else {
    // Используем обычный жанр
    const genre = genreMap[formData.musicStyle] || genreMap['pop']
    genreName = isRussian ? genre.ru : genre.uk
    genreStyle = isRussian ? 
      (genre.style === 'catchy, melodic, with memorable hooks' ? 'запоминающийся, мелодичный, с яркими припевами' :
       genre.style === 'powerful, energetic, with strong rhythm' ? 'мощный, энергичный, с сильным ритмом' :
       genre.style === 'smooth, sophisticated, with complex harmonies' ? 'плавный, утонченный, со сложными гармониями' :
       genre.style === 'emotional, slow, with deep lyrics' ? 'эмоциональный, медленный, с глубокими текстами' :
       genre.style === 'traditional, storytelling, with acoustic feel' ? 'традиционный, повествовательный, с акустическим звучанием' :
       genre.style === 'down-to-earth, narrative, with country themes' ? 'простодушный, повествовательный, с кантри-тематикой' :
       genre.style) :
      (genre.style === 'catchy, melodic, with memorable hooks' ? 'запам\'ятовуваний, мелодійний, з яскравими приспівами' :
       genre.style === 'powerful, energetic, with strong rhythm' ? 'потужний, енергійний, з сильним ритмом' :
       genre.style === 'smooth, sophisticated, with complex harmonies' ? 'плавний, витончений, зі складними гармоніями' :
       genre.style === 'emotional, slow, with deep lyrics' ? 'емоційний, повільний, з глибокими текстами' :
       genre.style === 'traditional, storytelling, with acoustic feel' ? 'традиційний, оповідний, з акустичним звучанням' :
       genre.style === 'down-to-earth, narrative, with country themes' ? 'простодушний, оповідний, з кантрі-тематикою' :
       genre.style)
    musicStyleForSuno = genre.style
  }

  // Определяем тип голоса
  const voiceInfo = voiceTypeMap[formData.voiceType || 'female']
  const voiceType = isRussian ? voiceInfo.ru : voiceInfo.uk

  // Добавляем информацию о голосе к стилю для Suno
  let voiceInstruction = ''
  if (formData.voiceType === 'female') {
    musicStyleForSuno += ', female vocals'
    voiceInstruction = '[Female Vocal]'
  } else if (formData.voiceType === 'male') {
    musicStyleForSuno += ', male vocals'
    voiceInstruction = '[Male Vocal]'
  } else if (formData.voiceType === 'duet') {
    musicStyleForSuno += ', duet, male and female vocals'
    voiceInstruction = '[Duet]'
  }

  // Анализируем длину персональных деталей
  const personalDetailsLength = formData.personalDetails ? formData.personalDetails.length : 0
  const hasDetailedContext = personalDetailsLength > 100
  
  // Определяем структуру песни в зависимости от контекста
  let songStructure = '[verse] - [chorus] - [verse] - [chorus] - [bridge] - [chorus]'
  let verseLines = 4
  let chorusLines = 4
  let bridgeLines = 4
  
  if (hasDetailedContext) {
    // Для богатого контекста делаем песню длиннее
    songStructure = '[verse] - [chorus] - [verse] - [chorus] - [verse] - [chorus] - [bridge] - [chorus]'
    verseLines = 6
    chorusLines = 4
    bridgeLines = 6
  }

  // Определяем дополнительные теги
  let additionalTags: string[] = []
  if (formData.useStarStyle && formData.artistStyle) {
    additionalTags = artistMusicalTags[formData.artistStyle] || []
  } else {
    additionalTags = genreMusicalTags[formData.musicStyle] || []
  }

  // Сохраняем стиль для Suno в специальном поле
  (formData as any).sunoStyle = musicStyleForSuno

  // Создаем промпт в зависимости от языка
  if (isRussian) {
    return `
Создай текст песни-поздравления в стиле ${genreName} ${language} для ${relationship} на ${formData.occasion.toLowerCase()}.

ДЕТАЛИ ЗАКАЗА:
- Имя получателя: ${formData.recipientName}
- Повод: ${formData.occasion}
- Отношения: ${formData.relationship}
- Настроение: ${mood}
- Музыкальный стиль: ${genreName} (${genreStyle})
- Тип голоса: ${voiceType}
${formData.personalDetails ? `- Персональные детали: ${formData.personalDetails}` : '- Персональные детали: не указано'}

ТРЕБОВАНИЯ К ФОРМАТУ:
1. Используй структуру песни: ${songStructure}
2. Размеры частей: куплеты по ${verseLines} строки, припев по ${chorusLines} строки, бридж по ${bridgeLines} строк
3. Текст должен быть рифмованным и мелодичным в стиле ${genreName}
4. Обязательно включить имя получателя "${formData.recipientName}" и повод "${formData.occasion}"
${formData.personalDetails ? `5. ИСПОЛЬЗУЙ ВСЕ ПЕРСОНАЛЬНЫЕ ДЕТАЛИ из контекста для создания уникального текста` : '5. Использовать общие темы для данного повода и отношений'}
6. Стиль: ${mood}, ${genreStyle}
7. Тип голоса: ${voiceType}${formData.voiceType === 'duet' ? ' - создай диалог между мужчиной и женщиной' : ''}
${hasDetailedContext ? `8. Учитывая богатый контекст, создай более детальный и персонализированный текст` : '8. Создай универсальный, но теплый текст'}
${additionalTags.length > 0 ? `9. Используй дополнительные теги: ${additionalTags.join(', ')} в подходящих местах` : ''}

СТРУКТУРА ПЕСНИ:
${songStructure}

${formData.voiceType === 'duet' ? `
ВАЖНО ДЛЯ ДУЭТА:
- Используй метатеги [Male Vocal] и [Female Vocal] для обозначения партий
- Создай диалог или перекличку между голосами
- В припеве голоса могут звучать вместе [Duet]
` : ''}

${additionalTags.length > 0 ? `
ДОПОЛНИТЕЛЬНЫЕ ТЕГИ:
Можешь использовать эти теги для украшения песни: ${additionalTags.join(', ')}
Например: ${additionalTags[0]} между куплетом и припевом, или ${additionalTags[additionalTags.length - 1]} в конце песни.
` : ''}

КРИТИЧЕСКИ ВАЖНО:
- Создай ТОЛЬКО текст песни в указанном формате
- НЕ добавляй никаких комментариев, пояснений или заголовков
- НЕ пиши "Вот текст песни" или подобные фразы
- Начинай сразу с метатегов и текста песни
- Текст должен быть готов для исполнения

ПРИМЕР ФОРМАТА:
${voiceInstruction ? `${voiceInstruction}\n` : ''}[verse]
${'Строка куплета\n'.repeat(verseLines).trim()}

[chorus]
${'Строка припева\n'.repeat(chorusLines).trim()}

${formData.voiceType === 'duet' ? `
[verse]
[Male Vocal]: Строка от мужчины
[Female Vocal]: Ответ от женщины
[Male Vocal]: Продолжение от мужчины
[Female Vocal]: Ответ от женщины

[chorus]
[Duet]: Строка припева вместе
[Duet]: Строка припева вместе
[Duet]: Строка припева вместе
[Duet]: Строка припева вместе
` : ''}
    `.trim()
  } else {
    return `
Створи текст пісні-привітання в стилі ${genreName} ${language} для ${relationship} на ${formData.occasion.toLowerCase()}.

ДЕТАЛІ ЗАМОВЛЕННЯ:
- Ім'я отримувача: ${formData.recipientName}
- Привід: ${formData.occasion}
- Стосунки: ${formData.relationship}
- Настрій: ${mood}
- Музичний стиль: ${genreName} (${genreStyle})
- Тип голосу: ${voiceType}
${formData.personalDetails ? `- Персональні деталі: ${formData.personalDetails}` : '- Персональні деталі: не вказано'}

ВИМОГИ ДО ФОРМАТУ:
1. Використовуй структуру пісні: ${songStructure}
2. Розміри частин: куплети по ${verseLines} рядки, приспів по ${chorusLines} рядки, бридж по ${bridgeLines} рядки
3. Текст повинен бути римованим та мелодійним у стилі ${genreName}
4. Обов'язково включити ім'я отримувача "${formData.recipientName}" та привід "${formData.occasion}"
${formData.personalDetails ? `5. ВИКОРИСТОВУЙ ВСІ ПЕРСОНАЛЬНІ ДЕТАЛІ з контексту для створення унікального тексту` : '5. Використовувати загальні теми для даного приводу та стосунків'}
6. Стиль: ${mood}, ${genreStyle}
7. Тип голосу: ${voiceType}${formData.voiceType === 'duet' ? ' - створи діалог між чоловіком та жінкою' : ''}
${hasDetailedContext ? `8. Враховуючи багатий контекст, створи більш детальний та персоналізований текст` : '8. Створи універсальний, але теплий текст'}
${additionalTags.length > 0 ? `9. Використовуй додаткові теги: ${additionalTags.join(', ')} у відповідних місцях` : ''}

СТРУКТУРА ПІСНІ:
${songStructure}

${formData.voiceType === 'duet' ? `
ВАЖЛИВО ДЛЯ ДУЕТУ:
- Використовуй метатеги [Male Vocal] та [Female Vocal] для позначення партій
- Створи діалог або перекличку між голосами
- У приспіві голоси можуть звучати разом [Duet]
` : ''}

${additionalTags.length > 0 ? `
ДОДАТКОВІ ТЕГИ:
Можеш використовувати ці теги для прикраси пісні: ${additionalTags.join(', ')}
Наприклад: ${additionalTags[0]} між куплетом та приспівом, або ${additionalTags[additionalTags.length - 1]} в кінці пісні.
` : ''}

КРИТИЧНО ВАЖЛИВО:
- Створи ЛИШЕ текст пісні у вказаному форматі
- НЕ додавай жодних коментарів, пояснень чи заголовків
- НЕ пиши "Ось текст пісні" або подібні фрази
- Починай одразу з метатегів та тексту пісні
- Текст повинен бути готовий для виконання

ПРИКЛАД ФОРМАТУ:
${voiceInstruction ? `${voiceInstruction}\n` : ''}[verse]
${'Рядок куплету\n'.repeat(verseLines).trim()}

[chorus]
${'Рядок приспіву\n'.repeat(chorusLines).trim()}

${formData.voiceType === 'duet' ? `
[verse]
[Male Vocal]: Рядок від чоловіка
[Female Vocal]: Відповідь від жінки
[Male Vocal]: Продовження від чоловіка
[Female Vocal]: Відповідь від жінки

[chorus]
[Duet]: Рядок приспіву разом
[Duet]: Рядок приспіву разом
[Duet]: Рядок приспіву разом
[Duet]: Рядок приспіву разом
` : ''}
    `.trim()
  }
}

/**
 * Очистка текста от лишних комментариев Gemini
 */
function cleanGeneratedText(text: string): string {
  if (!text) return text
  
  // Удаляем вводные фразы
  const introPatterns = [
    /^.*?[Вв]от текст.*?пісні.*?:\s*/,
    /^.*?[Оо]сь текст.*?пісні.*?:\s*/,
    /^.*?[Тт]екст пісні.*?:\s*/,
    /^.*?[Пп]існя.*?:\s*/,
    /^.*?в стилі.*?:\s*/,
    /^.*?який міг би.*?:\s*/,
    /^.*?для.*?голос.*?:\s*/
  ]
  
  let cleanedText = text
  for (const pattern of introPatterns) {
    cleanedText = cleanedText.replace(pattern, '')
  }
  
  // Удаляем заключительные комментарии
  const outroPatterns = [
    /\n\n.*?[Цц]я пісня.*$/,
    /\n\n.*?[Сс]подіваюся.*$/,
    /\n\n.*?[Нн]адіюся.*$/,
    /\n\n.*?[Дд]умаю.*$/
  ]
  
  for (const pattern of outroPatterns) {
    cleanedText = cleanedText.replace(pattern, '')
  }
  
  // Удаляем лишние пустые строки в начале и конце
  cleanedText = cleanedText.trim()
  
  // Удаляем множественные пустые строки
  cleanedText = cleanedText.replace(/\n\n\n+/g, '\n\n')
  
  return cleanedText
} 