import { FormData } from '@/types'
import { generateCoverArt } from '@/services/coverArtService'
import { setActiveGeneration } from '@/lib/localStorage'

const SUNO_API_KEY = process.env.NEXT_PUBLIC_SUNO_API_KEY
const SUNO_API_URL = 'https://apibox.erweima.ai'
const SUNO_CALLBACK_URL = process.env.NEXT_PUBLIC_SUNO_CALLBACK_URL || 'https://webhook.site/60dbf7c4-e76a-498a-b33d-b1868ae6ee9c'

// Кеш для статусов генерации
const statusCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 30000 // 30 секунд кеширования (увеличено с 10)
const RATE_LIMIT_DELAY = 5000 // 5 секунд между запросами (увеличено с 2)
let lastRequestTime = 0

// Для локальной разработки используем webhook.site
// В продакшене нужно будет настроить реальный callback URL с HTTPS

// Функция для соблюдения rate limit
async function rateLimitDelay() {
  const now = Date.now()
  const timeSinceLastRequest = now - lastRequestTime
  
  if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
    const delay = RATE_LIMIT_DELAY - timeSinceLastRequest
    console.log(`⏳ Rate limit: чекаю ${delay}ms перед наступним запитом`)
    await new Promise(resolve => setTimeout(resolve, delay))
  }
  
  lastRequestTime = Date.now()
}

// Функция для очистки кеша
export function clearStatusCache(taskId?: string) {
  if (taskId) {
    statusCache.delete(taskId)
    console.log(`🗑️ Очищено кеш для taskId: ${taskId}`)
  } else {
    statusCache.clear()
    console.log('🗑️ Очищено весь кеш статусів')
  }
}

export async function generateMusic(text: string, formData: any): Promise<{ url: string; type: string; taskId?: string; coverUrl?: string; openaiCoverStatus: string; openaiCoverError: string }> {
  console.log('🎵 Початок генерації музики...')
  console.log('📝 Текст:', text)
  console.log('📋 Дані форми:', formData)

  // Проверяем API ключ
  if (!SUNO_API_KEY) {
    console.error('❌ Suno API ключ не знайдено')
    throw new Error('Suno API ключ не знайдено')
  }
  console.log('✅ Suno API ключ знайдено')

  let openaiCoverUrl = ''
  let openaiCoverStatus = 'not started'
  let openaiCoverError = ''

  try {
    // Если премиум — запускаем генерацию обложки OpenAI параллельно
    let coverPromise: Promise<string> | null = null
    if (formData.plan === 'premium') {
      openaiCoverStatus = 'started'
      console.log('🖼️ [OpenAI] Запускаю генерацию обкладинки паралельно з музикою...')
      coverPromise = generateCoverArt(formData, text, 'premium')
    }

    // Соблюдаем rate limit
    await rateLimitDelay()
    
    // Формируем полный стиль для Suno
    let fullStyle = 'pop' // базовый стиль по умолчанию
    
    if (formData.useStarStyle && formData.artistStyle) {
      // Используем стиль артиста
      const artistStyleMap: { [key: string]: string } = {
        // Украинские артисты (скорочені до 180 символів)
        'okean_elzy': 'rock, alternative rock, indie rock, warm voice, raspy voice, baritone voice, emotional voice, melodic voice, powerful voice, Ukrainian',
        'svyatoslav_vakarchuk': 'rock, alternative rock, patriotic rock, warm voice, raspy voice, baritone voice, emotional voice, powerful voice, Ukrainian male vocals',
        'jamala': 'ethno-pop, world music, jazz influences, soulful voice, emotional female vocals, powerful voice, expressive voice, melismatic voice, Ukrainian',
        'tina_karol': 'pop, dance pop, europop, energetic, bright voice, clear voice, soprano voice, melodic voice, catchy voice, expressive voice, female vocals',
        'verka_serduchka': 'eurodance, fun, theatrical, comedic voice, energetic voice, catchy voice, dance music, Ukrainian',
        
        // Международные поп-артисты (скорочені)
        'taylor_swift': 'pop, alternative folk, emotional, female vocals, storytelling voice, melodic voice, expressive voice, clear voice',
        'ed_sheeran': 'folk-pop, acoustic guitar loops, male vocals, warm voice, melodic voice, storytelling voice, soft voice',
        'adele': 'soul, pop ballads, powerful female vocals, emotional voice, rich voice, expressive voice, melismatic voice',
        'billie_eilish': 'alternative pop, dark pop, whisper vocals, female vocals, breathy voice, intimate voice, unique voice',
        'ariana_grande': 'pop, R&B, powerful female vocals, soprano voice, melismatic voice, expressive voice, clear voice',
        'justin_bieber': 'pop, R&B, male vocals, smooth voice, melodic voice, contemporary voice, expressive voice',
        'bruno_mars': 'pop, funk, soul, male vocals, smooth voice, energetic voice, versatile voice, charismatic voice',
        'dua_lipa': 'dance-pop, disco-pop, female vocals, clear voice, melodic voice, catchy voice, modern voice',
        
        // Рок артисты (скорочені)
        'coldplay': 'alternative rock, pop rock, atmospheric, male vocals, emotional voice, melodic voice, anthemic voice',
        'imagine_dragons': 'alternative rock, pop rock, energetic, male vocals, powerful voice, dynamic voice, modern rock',
        'queen': 'rock, operatic rock, theatrical, male vocals, powerful voice, dramatic voice, iconic voice',
        'the_beatles': 'rock, pop rock, classic rock, male vocals, harmonious voices, melodic voice, timeless voice',
        
        // R&B/Soul артисты (скорочені)
        'beyonce': 'R&B, pop, soul, powerful female vocals, melismatic voice, expressive voice, dynamic voice',
        'john_legend': 'R&B, soul, piano ballads, male vocals, smooth voice, emotional voice, soulful voice',
        'alicia_keys': 'R&B, soul, neo-soul, female vocals, powerful voice, soulful voice, piano-driven',
        
        // Classic/Jazz артисты (скорочені)
        'frank_sinatra': 'jazz, traditional pop, swing, male vocals, smooth voice, crooner voice, classic voice',
        'ella_fitzgerald': 'jazz, swing, scat singing, female vocals, versatile voice, smooth voice, improvisational',
        'nat_king_cole': 'jazz, traditional pop, smooth, male vocals, warm voice, intimate voice, classic voice'
      }
      
      fullStyle = artistStyleMap[formData.artistStyle] || 'pop, energetic'
    } else {
      // Используем обычный жанр
      const genreStyleMap: { [key: string]: string } = {
        'pop': 'pop, upbeat, mainstream, radio-friendly, catchy hooks, modern production, clear vocals',
        'rock': 'rock, electric guitars, driving drums, powerful vocals, energetic, guitar solos',
        'jazz': 'jazz, swing, improvisation, brass instruments, complex chords, sophisticated',
        'ballad': 'ballad, slow tempo, emotional, piano-driven, heartfelt vocals, romantic',
        'folk': 'folk, acoustic guitar, storytelling, organic, traditional, intimate vocals',
        'country': 'country, acoustic guitar, banjo, storytelling, down-to-earth, twangy vocals',
        'electronic': 'electronic, synthesizers, dance beats, digital production, modern, pulsing',
        'reggae': 'reggae, off-beat rhythm, bass-heavy, laid-back, Caribbean feel, relaxed vocals',
        'blues': 'blues, guitar-driven, soulful vocals, emotional, minor keys, expressive',
        'funk': 'funk, groovy bass lines, rhythmic, danceable, syncopated, tight rhythm section'
      }
      
      fullStyle = genreStyleMap[formData.musicStyle] || 'pop, upbeat, mainstream, radio-friendly, catchy hooks, modern production, clear vocals'
    }
    
    // Добавляем тип голоса
    if (formData.voiceType === 'female') {
      if (!fullStyle.includes('female vocals')) {
        fullStyle += ', female vocals'
      }
    } else if (formData.voiceType === 'male') {
      if (!fullStyle.includes('male vocals')) {
        fullStyle += ', male vocals'
      }
    } else if (formData.voiceType === 'duet') {
      fullStyle += ', duet, male and female vocals'
    }
    
    // Добавляем настроение к стилю, если его там нет
    if (formData.mood && !fullStyle.includes(formData.mood)) {
      const moodMap: { [key: string]: string } = {
        'joyful': 'joyful',
        'tender': 'tender',
        'solemn': 'solemn',
        'energetic': 'energetic'
      }
      const moodKeyword = moodMap[formData.mood] || formData.mood
      fullStyle += `, ${moodKeyword}`
    }
    
    // Перевіряємо та обрізаємо стиль до максимальної довжини
    if (fullStyle.length > 190) {
      console.log(`⚠️ Стиль занадто довгий (${fullStyle.length} символів), обрізаю до 190`)
      fullStyle = fullStyle.substring(0, 190).replace(/,\s*$/, '') // обрізаємо і прибираємо кому в кінці
      console.log(`🎯 Обрізаний стиль: ${fullStyle}`)
    }
    
    console.log('🎨 Формирование стиля для Suno:')
    console.log('  - useStarStyle:', formData.useStarStyle)
    console.log('  - artistStyle:', formData.artistStyle)
    console.log('  - musicStyle:', formData.musicStyle)
    console.log('  - voiceType:', formData.voiceType)
    console.log('  - mood:', formData.mood)
    console.log('🎯 Итоговый стиль для Suno:', fullStyle)
    
    const requestBody = {
      customMode: true,
      model: 'V3_5',
      prompt: text,
      style: fullStyle,
      title: `Поздравление для ${formData.recipientName}`,
      output_format: 'mp3',
      duration: 120,
      instrumental: false,
      callBackUrl: process.env.NEXT_PUBLIC_SUNO_CALLBACK_URL || 'https://webhook.site/60dbf7c4-e76a-498a-b33d-b1868ae6ee9c'
    }

    console.log('🚀 Створення завдання на генерацію музики...')
    console.log('📤 Відправляю запит:', requestBody)

    const createResponse = await fetch(`${SUNO_API_URL}/api/v1/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUNO_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    console.log(`📡 Відповідь API: ${createResponse.status} ${createResponse.statusText}`)

    if (!createResponse.ok) {
      const errorText = await createResponse.text()
      console.error(`❌ Помилка створення завдання: ${createResponse.status} - ${errorText}`)
      throw new Error(`HTTP error! status: ${createResponse.status}`)
    }

    const createData = await createResponse.json()
    console.log('📋 Дані відповіді:', createData)

    if (createData.code !== 200) {
      console.error(`❌ API повернув помилку: ${createData.msg}`)
      // Передаем оригинальное сообщение об ошибке от Suno API
      throw new Error(createData.msg || 'API повернув помилку')
    }

    if (!createData.data || !createData.data.taskId) {
      console.error('❌ Не отримано ID завдання від Suno API')
      console.error('🔎 Повна відповідь від Suno API:', JSON.stringify(createData, null, 2))
      throw new Error('Не отримано ID завдання від Suno API')
    }

    const taskId = createData.data.taskId
    console.log(`✅ Завдання створено з ID: ${taskId}`)

    // Дожидаемся генерации обложки OpenAI, если премиум
    if (formData.plan === 'premium' && coverPromise) {
      try {
        openaiCoverStatus = 'waiting'
        openaiCoverUrl = await coverPromise
        openaiCoverStatus = 'success'
        console.log('🖼️ [OpenAI] Обкладинка згенерована:', openaiCoverUrl)
      } catch (err) {
        openaiCoverStatus = 'error'
        openaiCoverError = String(err)
        console.error('❌ [OpenAI] Помилка генерації обкладинки:', err)
      }
    }

    // Возвращаем taskId и обложку (если есть)
    return {
      url: '',
      type: 'pending',
      taskId,
      coverUrl: formData.plan === 'premium' ? openaiCoverUrl : undefined,
      openaiCoverStatus,
      openaiCoverError
    }
  } catch (error) {
    console.error('❌ Помилка генерації музики:', error)
    throw error
  }
}

export async function waitForGeneration(taskId: string): Promise<{ url: string; type: string; coverUrl?: string; secondMusicUrl?: string }> {
  console.log(`⏳ Очікую завершення генерації для taskId: ${taskId}`)
  
  const maxAttempts = 60 // 5 минут
  let attempts = 0
  
  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 5000)) // Ждем 5 секунд
    attempts++
    
    try {
      console.log(`🔍 Перевірка статусу (спроба ${attempts}/${maxAttempts})...`)
      
      const response = await fetch(`${SUNO_API_URL}/api/v1/generate/record-info?taskId=${taskId}`, {
        headers: {
          'Authorization': `Bearer ${SUNO_API_KEY}`,
        },
      })

      if (!response.ok) {
        console.error(`❌ Помилка перевірки статусу: ${response.status}`)
        continue
      }

      const data = await response.json()
      console.log(`📊 Статус завдання:`, data)

      if (data.code === 200 && data.data) {
        const taskData = data.data
        const status = taskData.status
        
        console.log(`📋 Статус: ${status}`)
        
        if (status === 'TEXT_SUCCESS') {
          console.log('✅ Текст оброблено успішно')
          // Не завершаем генерацию, продолжаем ожидание
          continue
        } else if (status === 'FIRST_SUCCESS') {
          console.log('✅ Перша версія готова')
          
          // Извлекаем URL из sunoData
          if (taskData.response && taskData.response.sunoData && Array.isArray(taskData.response.sunoData)) {
            const track = taskData.response.sunoData[0]
            if (track && track.streamAudioUrl) {
              console.log('🎵 Отримано streaming URL:', track.streamAudioUrl)
              // Не завершаем генерацию, продолжаем ожидание для получения финальной версии
              continue
            }
          }
          
          // Не завершаем генерацию, продолжаем ожидание
          continue
        } else if (status === 'SUCCESS') {
          console.log('✅ Генерація завершена успішно')
          
          // Извлекаем URL и обложку из sunoData
          if (taskData.response && taskData.response.sunoData && Array.isArray(taskData.response.sunoData)) {
            const tracks = taskData.response.sunoData
            
            console.log(`🎵 Всього треків у відповіді: ${tracks.length}`)
            console.log(`🎵 Повна відповідь Suno API:`, JSON.stringify(tracks, null, 2))
            
            tracks.forEach((track: any, index: number) => {
              console.log(`🎵 Трек ${index + 1}:`, {
                audioUrl: track.audioUrl,
                streamAudioUrl: track.streamAudioUrl,
                imageUrl: track.imageUrl,
                hasAudioUrl: !!track.audioUrl,
                hasStreamAudioUrl: !!track.streamAudioUrl,
                allFields: Object.keys(track)
              })
            })
            
            // Первая песня
            if (tracks.length > 0) {
              const firstTrack = tracks[0]
              console.log('🖼️ Дані першого треку для обкладинки:', {
                imageUrl: firstTrack.imageUrl,
                source_image_url: firstTrack.source_image_url,
                image_url: firstTrack.image_url,
                hasImageUrl: !!firstTrack.imageUrl,
                hasSourceImageUrl: !!firstTrack.source_image_url,
                hasImageUrlAlt: !!firstTrack.image_url
              })
              
              let audioUrl = ''
              let coverUrl = ''
              let musicUrl = ''
              let secondMusicUrl = ''
              
              if (firstTrack.audioUrl) {
                audioUrl = firstTrack.audioUrl
                musicUrl = firstTrack.audioUrl
              } else if (firstTrack.streamAudioUrl) {
                audioUrl = firstTrack.streamAudioUrl
                musicUrl = firstTrack.streamAudioUrl
              }
              
              // Обложка от Suno API - проверяем разные поля
              if (firstTrack.imageUrl) {
                coverUrl = firstTrack.imageUrl
                console.log('🖼️ Отримано обкладинку від Suno API (SUCCESS, imageUrl):', coverUrl)
              } else if (firstTrack.source_image_url) {
                coverUrl = firstTrack.source_image_url
                console.log('🖼️ Отримано обкладинку від Suno API (SUCCESS, source_image_url):', coverUrl)
              } else if (firstTrack.image_url) {
                coverUrl = firstTrack.image_url
                console.log('🖼️ Отримано обкладинку від Suno API (SUCCESS, image_url):', coverUrl)
              }
              
              // Если обложка не найдена в основном ответе, пробуем получить из callback'а
              if (!coverUrl) {
                try {
                  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
                  const callbackResponse = await fetch(`${baseUrl}/api/generate/music/callback?taskId=${taskId}`)
                  
                  if (callbackResponse.ok) {
                    const callbackData = await callbackResponse.json()
                    if (callbackData.coverUrl) {
                      coverUrl = callbackData.coverUrl
                      console.log('🖼️ Отримано обкладинку з callback (waitForGeneration):', coverUrl)
                    }
                  }
                } catch (callbackError) {
                  console.log('⚠️ Не вдалося отримати обкладинку з callback (waitForGeneration):', callbackError)
                }
              }
              
              // Вторая песня (если есть)
              if (tracks.length > 1) {
                const secondTrack = tracks[1]
                console.log('🎵 Дані другого треку:', {
                  audioUrl: secondTrack.audioUrl,
                  streamAudioUrl: secondTrack.streamAudioUrl,
                  hasAudioUrl: !!secondTrack.audioUrl,
                  hasStreamAudioUrl: !!secondTrack.streamAudioUrl
                })
                
                if (secondTrack.audioUrl) {
                  secondMusicUrl = secondTrack.audioUrl
                  console.log('🎵 Отримано другу пісню (audioUrl):', secondMusicUrl)
                } else if (secondTrack.streamAudioUrl) {
                  secondMusicUrl = secondTrack.streamAudioUrl
                  console.log('🎵 Отримано другу пісню (streamAudioUrl):', secondMusicUrl)
                }
              } else {
                console.log('⚠️ Знайдено тільки один трек, другого немає')
              }
              
              console.log(`🎵 Фінальні URL: musicUrl=${musicUrl}, secondMusicUrl=${secondMusicUrl}`)
              console.log('🎵 Отримано фінальний URL:', audioUrl)
              
              // Сохраняем статус в базе данных с обоими треками
              try {
                const taskData = data.data
                console.log('💾 waitForGeneration: зберігаю статус з треками:', {
                  musicUrl: audioUrl,
                  secondMusicUrl: secondMusicUrl,
                  coverUrl: coverUrl
                })
                await saveGenerationStatus(taskId, {
                  status: 'SUCCESS',
                  type: 'complete',
                  musicUrl: audioUrl,
                  coverUrl: coverUrl,
                  secondMusicUrl: secondMusicUrl,
                  data: taskData
                }, taskData.formData || {}, taskData.text || '')
                console.log('💾 Статус SUCCESS з обома треками збережено в БД (waitForGeneration)')
              } catch (saveError) {
                console.error('❌ Помилка збереження статусу SUCCESS (waitForGeneration):', saveError)
              }
              
              return { url: audioUrl, type: 'complete', coverUrl, secondMusicUrl }
            }
          }
        } else if (status === 'FAILED') {
          console.error('❌ Генерація не вдалася')
          throw new Error('Генерація не вдалася')
        } else if (status === 'GENERATE_AUDIO_FAILED') {
          console.error('❌ Помилка генерації аудіо')
          throw new Error('Помилка генерації аудіо')
        }
      }
      
      console.log(`⏳ Статус ще не готовий, очікую... (спроба ${attempts}/${maxAttempts})`)
      
    } catch (error) {
      console.error(`❌ Помилка перевірки статусу (спроба ${attempts}):`, error)
    }
  }
  
  console.error('❌ Час очікування вичерпано')
  throw new Error('Час очікування вичерпано')
}

export async function getGenerationStatus(taskId: string) {
  console.log(`🔍 Перевірка статусу для taskId: ${taskId}`)
  
  // Проверяем кеш
  const cached = statusCache.get(taskId)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log(`📋 Використовую кешований статус для taskId: ${taskId}`)
    return cached.data
  }
  
  try {
    // Соблюдаем rate limit
    await rateLimitDelay()
    
    const response = await fetch(`${SUNO_API_URL}/api/v1/generate/record-info?taskId=${taskId}`, {
      headers: {
        'Authorization': `Bearer ${SUNO_API_KEY}`,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ Помилка перевірки статусу: ${response.status} - ${errorText}`)
      
      // Если это ошибка rate limit, возвращаем кешированный результат или базовый статус
      if (response.status === 429 || errorText.includes('frequency is too high')) {
        console.log('⚠️ Rate limit досягнуто, використовую кеш або базовий статус')
        if (cached) {
          return cached.data
        }
        // Возвращаем базовый статус, чтобы не прерывать процесс
        return {
          success: true,
          type: 'pending',
          status: 'PENDING',
          musicUrl: '',
          coverUrl: '',
          secondMusicUrl: '',
          openaiCoverStatus: '',
          openaiCoverUrl: '',
          openaiCoverError: '',
          data: { status: 'PENDING' }
        }
      }
      
      // Для других ошибок возвращаем понятное сообщение
      let errorMessage = `HTTP error! status: ${response.status}`
      if (errorText.includes('insufficient') || errorText.includes('credits')) {
        errorMessage = 'На жаль, зараз сервіс тимчасово недоступний через технічні роботи. Спробуйте пізніше.'
      } else if (errorText.includes('invalid') || errorText.includes('bad request')) {
        errorMessage = 'Помилка в даних запиту. Перевірте taskId і спробуйте знову.'
      }
      
      return { 
        success: false,
        error: errorMessage,
        details: errorText
      }
    }

    const data = await response.json()
    console.log(`📊 Статус завдання:`, data)

    if (data.code === 200 && data.data) {
      const taskData = data.data
      const status = taskData.status
      
      let type = 'pending'
      let musicUrl = ''
      let coverUrl = ''
      let secondMusicUrl = ''
      
      if (status === 'TEXT_SUCCESS') {
        type = 'text'
        console.log('📝 Статус TEXT_SUCCESS, перевіряю наявність тексту в даних')
        console.log('📝 Дані завдання:', JSON.stringify(taskData, null, 2))
        
        // Сохраняем статус TEXT_SUCCESS в базу данных
        try {
          const formData = taskData.formData || (taskData.data && taskData.data.formData) || {}
          const text = taskData.text || ''
          await saveGenerationStatus(taskId, {
            status: 'TEXT_SUCCESS',
            type: 'text',
            musicUrl: '',
            coverUrl: '',
            secondMusicUrl: '',
            data: taskData
          }, formData, text)
          console.log('💾 Статус TEXT_SUCCESS збережено в БД')
        } catch (saveError) {
          console.error('❌ Помилка збереження статусу TEXT_SUCCESS:', saveError)
        }
        
        // Гарантируем актуальный plan
        let plan = (taskData.formData && taskData.formData.plan) || (taskData.data && taskData.data.formData && taskData.data.formData.plan)
        if (!plan) {
          // Пробуем взять из кеша
          const cached = statusCache.get(taskId)
          if (cached && cached.data && cached.data.formData && cached.data.formData.plan) {
            plan = cached.data.formData.plan
          } else {
            // Пробуем взять из базы
            try {
              const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
              const statusRes = await fetch(`${baseUrl}/api/generate/music/status?taskId=${taskId}`)
              if (statusRes.ok) {
                const statusJson = await statusRes.json()
                if (statusJson.formData && statusJson.formData.plan) {
                  plan = statusJson.formData.plan
                }
              }
            } catch (e) { /* ignore */ }
          }
        }
        plan = plan || 'basic'
        // Если премиум — запускаем генерацию OpenAI-обложки и сохраняем
        if (plan === 'premium' && !taskData.openaiCoverUrl) {
          try {
            console.log('🟡 [DEBUG] Запускаю generateCoverArt для OpenAI (premium)')
            const { generateCoverArt } = await import('@/services/coverArtService')
            const openaiCoverUrl = await generateCoverArt(taskData.formData || (taskData.data && taskData.data.formData) || {}, taskData.text || '', 'premium')
            console.log('🟢 [DEBUG] generateCoverArt вернул:', openaiCoverUrl)
            taskData.openaiCoverUrl = openaiCoverUrl
            taskData.openaiCoverStatus = 'success'
            taskData.openaiCoverError = ''
            // Сохраняем статус с актуальным plan
            await saveGenerationStatus(taskId, {
              ...taskData,
              openaiCoverUrl,
              openaiCoverStatus: 'success',
              openaiCoverError: '',
              plan
            }, { ...taskData.formData, plan }, taskData.text || '')
            console.log('🖼️ [OpenAI] Обкладинка згенерована і збережена для преміум:', openaiCoverUrl)
          } catch (err) {
            taskData.openaiCoverStatus = 'error'
            taskData.openaiCoverError = String(err)
            await saveGenerationStatus(taskId, {
              ...taskData,
              openaiCoverUrl: '',
              openaiCoverStatus: 'error',
              openaiCoverError: String(err),
              plan
            }, { ...taskData.formData, plan }, taskData.text || '')
            console.error('❌ [OpenAI] Помилка генерації обкладинки для преміум:', err)
          }
        } else if (plan !== 'premium') {
          console.log('🔵 [DEBUG] generateCoverArt не вызывается, plan:', plan)
        }
      } else if (status === 'PENDING') {
        type = 'pending'
        
        // Сохраняем статус PENDING в базу данных
        try {
          const formData = taskData.formData || (taskData.data && taskData.data.formData) || {}
          const text = taskData.text || ''
          await saveGenerationStatus(taskId, {
            status: 'PENDING',
            type: 'pending',
            musicUrl: '',
            coverUrl: '',
            secondMusicUrl: '',
            data: taskData
          }, formData, text)
          console.log('💾 Статус PENDING збережено в БД')
        } catch (saveError) {
          console.error('❌ Помилка збереження статусу PENDING:', saveError)
        }
      } else if (status === 'FIRST_SUCCESS') {
        type = 'streaming'
        
        // Извлекаем URL и обложку из sunoData для первой версии
        if (taskData.response && taskData.response.sunoData && Array.isArray(taskData.response.sunoData)) {
          const track = taskData.response.sunoData[0]
          if (track) {
            console.log('🖼️ Дані треку FIRST_SUCCESS для обкладинки:', {
              imageUrl: track.imageUrl,
              source_image_url: track.source_image_url,
              image_url: track.image_url,
              hasImageUrl: !!track.imageUrl,
              hasSourceImageUrl: !!track.source_image_url,
              hasImageUrlAlt: !!track.image_url
            })
            
            if (track.streamAudioUrl) {
              musicUrl = track.streamAudioUrl
            } else if (track.audioUrl) {
              musicUrl = track.audioUrl
            }
            
            // Обложка от Suno API - проверяем разные поля
            if (track.imageUrl) {
              coverUrl = track.imageUrl
              console.log('🖼️ Отримано обкладинку від Suno API (FIRST_SUCCESS, imageUrl):', coverUrl)
            } else if (track.source_image_url) {
              coverUrl = track.source_image_url
              console.log('🖼️ Отримано обкладинку від Suno API (FIRST_SUCCESS, source_image_url):', coverUrl)
            } else if (track.image_url) {
              coverUrl = track.image_url
              console.log('🖼️ Отримано обкладинку від Suno API (FIRST_SUCCESS, image_url):', coverUrl)
            }
            
            // Если обложка не найдена в основном ответе, пробуем получить из callback'а
            if (!coverUrl) {
              try {
                const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
                const callbackResponse = await fetch(`${baseUrl}/api/generate/music/callback?taskId=${taskId}`)
                
                if (callbackResponse.ok) {
                  const callbackData = await callbackResponse.json()
                  if (callbackData.coverUrl) {
                    coverUrl = callbackData.coverUrl
                    console.log('🖼️ Отримано обкладинку з callback (FIRST_SUCCESS):', coverUrl)
                  }
                }
              } catch (callbackError) {
                console.log('⚠️ Не вдалося отримати обкладинку з callback (FIRST_SUCCESS):', callbackError)
              }
            }
          }
        }
        
        // Сохраняем статус FIRST_SUCCESS в базу данных
        try {
          const formData = taskData.formData || (taskData.data && taskData.data.formData) || {}
          const text = taskData.text || ''
          await saveGenerationStatus(taskId, {
            status: 'FIRST_SUCCESS',
            type: 'streaming',
            musicUrl: musicUrl,
            coverUrl: coverUrl,
            secondMusicUrl: secondMusicUrl,
            data: taskData
          }, formData, text)
          console.log('💾 Статус FIRST_SUCCESS збережено в БД')
        } catch (saveError) {
          console.error('❌ Помилка збереження статусу FIRST_SUCCESS:', saveError)
        }
      } else if (status === 'SUCCESS') {
        type = 'complete'
        
        // Извлекаем URL и обложку из sunoData
        if (taskData.response && taskData.response.sunoData && Array.isArray(taskData.response.sunoData)) {
          const tracks = taskData.response.sunoData
          
          console.log(`🎵 Всього треків у відповіді: ${tracks.length}`)
          console.log(`🎵 Повна відповідь Suno API:`, JSON.stringify(tracks, null, 2))
          
          tracks.forEach((track: any, index: number) => {
            console.log(`🎵 Трек ${index + 1}:`, {
              audioUrl: track.audioUrl,
              streamAudioUrl: track.streamAudioUrl,
              imageUrl: track.imageUrl,
              hasAudioUrl: !!track.audioUrl,
              hasStreamAudioUrl: !!track.streamAudioUrl,
              allFields: Object.keys(track)
            })
          })
          
          // Первая песня
          if (tracks.length > 0) {
            const firstTrack = tracks[0]
            console.log('🖼️ Дані першого треку для обкладинки:', {
              imageUrl: firstTrack.imageUrl,
              source_image_url: firstTrack.source_image_url,
              image_url: firstTrack.image_url,
              hasImageUrl: !!firstTrack.imageUrl,
              hasSourceImageUrl: !!firstTrack.source_image_url,
              hasImageUrlAlt: !!firstTrack.image_url
            })
            
            if (firstTrack.audioUrl) {
              musicUrl = firstTrack.audioUrl
            } else if (firstTrack.streamAudioUrl) {
              musicUrl = firstTrack.streamAudioUrl
            }
            
            // Обложка от Suno API - проверяем разные поля
            if (firstTrack.imageUrl) {
              coverUrl = firstTrack.imageUrl
              console.log('🖼️ Отримано обкладинку від Suno API (SUCCESS, imageUrl):', coverUrl)
            } else if (firstTrack.source_image_url) {
              coverUrl = firstTrack.source_image_url
              console.log('🖼️ Отримано обкладинку від Suno API (SUCCESS, source_image_url):', coverUrl)
            } else if (firstTrack.image_url) {
              coverUrl = firstTrack.image_url
              console.log('🖼️ Отримано обкладинку від Suno API (SUCCESS, image_url):', coverUrl)
            }
            
            // Если обложка не найдена в основном ответе, пробуем получить из callback'а
            if (!coverUrl) {
              try {
                const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
                const callbackResponse = await fetch(`${baseUrl}/api/generate/music/callback?taskId=${taskId}`)
                
                if (callbackResponse.ok) {
                  const callbackData = await callbackResponse.json()
                  if (callbackData.coverUrl) {
                    coverUrl = callbackData.coverUrl
                    console.log('🖼️ Отримано обкладинку з callback:', coverUrl)
                  }
                }
              } catch (callbackError) {
                console.log('⚠️ Не вдалося отримати обкладинку з callback:', callbackError)
              }
            }
          }
          
          // Вторая песня (если есть)
          if (tracks.length > 1) {
            const secondTrack = tracks[1]
            console.log('🎵 Дані другого треку:', {
              audioUrl: secondTrack.audioUrl,
              streamAudioUrl: secondTrack.streamAudioUrl,
              hasAudioUrl: !!secondTrack.audioUrl,
              hasStreamAudioUrl: !!secondTrack.streamAudioUrl
            })
            
            if (secondTrack.audioUrl) {
              secondMusicUrl = secondTrack.audioUrl
              console.log('🎵 Отримано другу пісню (audioUrl):', secondMusicUrl)
            } else if (secondTrack.streamAudioUrl) {
              secondMusicUrl = secondTrack.streamAudioUrl
              console.log('🎵 Отримано другу пісню (streamAudioUrl):', secondMusicUrl)
            }
          } else {
            console.log('⚠️ Знайдено тільки один трек, другого немає')
          }
          
          console.log(`🎵 Фінальні URL: musicUrl=${musicUrl}, secondMusicUrl=${secondMusicUrl}`)
        }
        
        // Определяем план из taskData
        const plan = taskData.plan || 'basic'
        
        // Сохраняем статус SUCCESS в базу данных
        try {
          const formData = taskData.formData || (taskData.data && taskData.data.formData) || {}
          const text = taskData.text || ''
          await saveGenerationStatus(taskId, {
            status: 'SUCCESS',
            type: 'complete',
            musicUrl: musicUrl,
            coverUrl: coverUrl,
            secondMusicUrl: secondMusicUrl,
            data: taskData
          }, formData, text)
          console.log('💾 Статус SUCCESS збережено в БД')
        } catch (saveError) {
          console.error('❌ Помилка збереження статусу SUCCESS:', saveError)
        }
        
        // --- ДОБАВЛЯЕМ: всегда актуализируем coverUrl для сохранения ---
        let actualCoverUrl = coverUrl
        if (plan === 'premium' && (taskData.openaiCoverUrl || taskData.openaiCoverUrl === '')) {
          actualCoverUrl = taskData.openaiCoverUrl
        }
        const result = {
          success: true,
          type,
          status,
          musicUrl,
          coverUrl: actualCoverUrl,
          secondMusicUrl,
          openaiCoverStatus: taskData.openaiCoverStatus || '',
          openaiCoverUrl: taskData.openaiCoverUrl || '',
          openaiCoverError: taskData.openaiCoverError || '',
          data: taskData
        }
        // --- ДОБАВЛЯЕМ: сохраняем статус в базу после каждого обновления ---
        await saveGenerationStatus(taskId, {
          ...taskData,
          status: 'SUCCESS',
          type: 'complete',
          musicUrl: musicUrl,
          coverUrl: actualCoverUrl,
          secondMusicUrl: secondMusicUrl,
          openaiCoverUrl: taskData.openaiCoverUrl || '',
          openaiCoverStatus: taskData.openaiCoverStatus || '',
          openaiCoverError: taskData.openaiCoverError || '',
          plan
        }, { ...taskData.formData, plan }, taskData.text || '')
        
        // Сохраняем в кеш
        statusCache.set(taskId, { data: result, timestamp: Date.now() })
        
        return result
      } else if (status === 'FAILED') {
        type = 'failed'
        console.log('❌ Статус FAILED, генерація не вдалася')
        
        // Сохраняем статус FAILED в базу данных
        try {
          const formData = taskData.formData || (taskData.data && taskData.data.formData) || {}
          const text = taskData.text || ''
          await saveGenerationStatus(taskId, {
            status: 'FAILED',
            type: 'failed',
            musicUrl: '',
            coverUrl: '',
            secondMusicUrl: '',
            data: taskData
          }, formData, text)
          console.log('💾 Статус FAILED збережено в БД')
        } catch (saveError) {
          console.error('❌ Помилка збереження статусу FAILED:', saveError)
        }
        
        return {
          success: false,
          type,
          status,
          error: 'Генерація не вдалася',
          data: taskData
        }
      } else if (status === 'GENERATE_AUDIO_FAILED') {
        type = 'failed'
        console.log('❌ Статус GENERATE_AUDIO_FAILED, помилка генерації аудіо')
        
        // Сохраняем статус GENERATE_AUDIO_FAILED в базу данных
        try {
          const formData = taskData.formData || (taskData.data && taskData.data.formData) || {}
          const text = taskData.text || ''
          await saveGenerationStatus(taskId, {
            status: 'GENERATE_AUDIO_FAILED',
            type: 'failed',
            musicUrl: '',
            coverUrl: '',
            secondMusicUrl: '',
            data: taskData
          }, formData, text)
          console.log('💾 Статус GENERATE_AUDIO_FAILED збережено в БД')
        } catch (saveError) {
          console.error('❌ Помилка збереження статусу GENERATE_AUDIO_FAILED:', saveError)
        }
        
        return {
          success: false,
          type,
          status,
          error: 'Помилка генерації аудіо',
          data: taskData
        }
      }

      return data
    }

    return data
  } catch (error) {
    console.error('❌ Помилка перевірки статусу:', error)
    
    // Сбрасываем статус при ошибках
    await resetGenerationStatus(taskId)
    
    // При ошибке возвращаем кешированный результат или базовый статус
    if (cached) {
      console.log('📋 Використовую кешований статус при помилці')
      return cached.data
    }
    
    return { error: 'Failed to check status' }
  }
}

export async function saveGenerationStatus(taskId: string, statusData: any, formData?: any, text?: string) {
  try {
    console.log(`💾 saveGenerationStatus: зберігаю статус для taskId: ${taskId}`)
    console.log(`🖼️ saveGenerationStatus: обкладинка в statusData:`, statusData.coverUrl)
    console.log(`🖼️ saveGenerationStatus: тип обкладинки:`, typeof statusData.coverUrl)
    console.log(`🖼️ saveGenerationStatus: довжина обкладинки:`, statusData.coverUrl?.length)
    console.log(`🎵 saveGenerationStatus: musicUrl:`, statusData.musicUrl)
    console.log(`🎵 saveGenerationStatus: secondMusicUrl:`, statusData.secondMusicUrl)
    
    // Проверяем, где выполняется код
    if (typeof window === 'undefined') {
      // Серверная среда - используем прямой вызов API
      console.log('🖥️ Серверна среда - використовую прямий виклик API')
      
      // Импортируем необходимые модули для серверной среды
      const { NextRequest } = await import('next/server')
      const clientPromise = (await import('@/lib/mongodb')).default
      
      try {
        const client = await clientPromise
        const db = client.db()
        
        const statusRecord = {
          taskId,
          userId: formData?.userId || '',
          status: statusData.status,
          type: statusData.type || 'generation',
          musicUrl: statusData.musicUrl || '',
          coverUrl: statusData.coverUrl || '',
          secondMusicUrl: statusData.secondMusicUrl || '',
          openaiCoverStatus: statusData.openaiCoverStatus || '',
          openaiCoverUrl: statusData.openaiCoverUrl || '',
          openaiCoverError: statusData.openaiCoverError || '',
          data: statusData.data || {},
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

        console.log(`✅ Статус збережено в БД (сервер) для taskId: ${taskId}`)
        console.log(`✅ Статус збережено: ${statusData.status}`)
        
        return true
      } catch (dbError) {
        console.error('❌ Помилка збереження в БД (сервер):', dbError)
        return false
      }
    } else {
      // Клиентская среда - используем fetch
      console.log('🌐 Клієнтська среда - використовую fetch')
      
      const baseUrl = window.location.origin
      const response = await fetch(`${baseUrl}/api/generate/music/save-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId,
          status: statusData.status,
          type: statusData.type,
          musicUrl: statusData.musicUrl || '',
          coverUrl: statusData.coverUrl || '',
          secondMusicUrl: statusData.secondMusicUrl || '',
          data: statusData.data,
          formData: formData || {},
          text: text || '',
          openaiCoverStatus: statusData.openaiCoverStatus || '',
          openaiCoverUrl: statusData.openaiCoverUrl || '',
          openaiCoverError: statusData.openaiCoverError || ''
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      console.log(`💾 Статус збережено в БД (клієнт) для taskId: ${taskId}`)
      console.log(`💾 Статус збережено: ${statusData.status}`)
      
      // Если генерация завершена успешно, сохраняем приветствие в основную таблицу
      if (statusData.status === 'SUCCESS' && formData && text) {
        try {
          console.log('💾 Зберігаю привітання в основну таблицю при завершенні генерації')
          
          const plan = formData.plan || 'basic'
          
          // Получаем актуальные цены
          const basicPrice = 100
          const premiumPrice = 200
          
          const greetingResponse = await fetch(`${baseUrl}/api/greetings/auto-save`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              taskId: taskId,
              recipientName: formData.recipientName,
              occasion: formData.occasion,
              relationship: formData.relationship,
              personalDetails: formData.personalDetails,
              musicStyle: formData.musicStyle,
              mood: formData.mood,
              greetingLanguage: formData.greetingLanguage,
              text: text,
              plan: plan,
              totalPrice: plan === 'premium' ? premiumPrice : basicPrice,
              paymentMethod: 'liqpay',
              musicUrl: statusData.musicUrl || '',
              secondMusicUrl: statusData.secondMusicUrl || '',
              coverUrl: statusData.coverUrl || '',
              allowSharing: false
            })
          })

          if (greetingResponse.ok) {
            const result = await greetingResponse.json()
            console.log('✅ Привітання збережено в основну таблицю:', result.greeting.id)
          } else {
            console.error('❌ Помилка збереження привітання в основну таблицю:', greetingResponse.status)
          }
        } catch (greetingError) {
          console.error('❌ Помилка збереження привітання в основну таблицю:', greetingError)
        }
      }
      
      return true
    }
  } catch (error) {
    console.error('❌ Помилка збереження статусу:', error)
    
    // Fallback на localStorage только на клиенте
    if (typeof window !== 'undefined') {
      const statusRecord = {
        taskId,
        status: statusData.status,
        type: statusData.type,
        musicUrl: statusData.musicUrl || '',
        coverUrl: statusData.coverUrl || '',
        secondMusicUrl: statusData.secondMusicUrl || '',
        data: statusData.data,
        formData: formData || {},
        text: text || '',
        updatedAt: new Date()
      }
      localStorage.setItem(`generation_status_${taskId}`, JSON.stringify(statusRecord))
      console.log(`💾 Статус збережено в localStorage для taskId: ${taskId}`)
    }
    
    return false
  }
}

export async function getStoredGenerationStatus(taskId: string) {
  try {
    console.log(`🔍 getStoredGenerationStatus: отримую статус для taskId: ${taskId}`)
    
    // Пытаемся получить из базы данных
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/generate/music/save-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        taskId,
        action: 'get'
      })
    })
    
    if (response.ok) {
      const statusRecord = await response.json()
      console.log(`✅ Статус отримано з БД для taskId: ${taskId}`)
      console.log(`🖼️ getStoredGenerationStatus: обкладинка з БД:`, statusRecord.coverUrl)
      console.log(`🖼️ getStoredGenerationStatus: тип обкладинки:`, typeof statusRecord.coverUrl)
      console.log(`🖼️ getStoredGenerationStatus: довжина обкладинки:`, statusRecord.coverUrl?.length)
      return statusRecord
    }
    
    // Fallback на localStorage
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`generation_status_${taskId}`)
      if (stored) {
        const statusRecord = JSON.parse(stored)
        console.log(`✅ Статус отримано з localStorage для taskId: ${taskId}`)
        return statusRecord
      }
    }
    
    return null
  } catch (error) {
    console.error('❌ Помилка отримання збереженого статусу:', error)
    
    // Fallback на localStorage
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`generation_status_${taskId}`)
      if (stored) {
        const statusRecord = JSON.parse(stored)
        console.log(`✅ Статус отримано з localStorage (fallback) для taskId: ${taskId}`)
        return statusRecord
      }
    }
    
    return null
  }
}

// Функция для сброса статуса при ошибках
export async function resetGenerationStatus(taskId: string) {
  try {
    console.log(`🔄 Скидаю статус генерації для taskId: ${taskId}`)
    
    // Очищаем активную генерацию
    setActiveGeneration(null)
    
    // Очищаем кеш
    statusCache.delete(taskId)
    
    // Очищаем localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`generation_status_${taskId}`)
      localStorage.removeItem('activeGeneration')
    }
    
    console.log(`✅ Статус генерації скинуто для taskId: ${taskId}`)
  } catch (error) {
    console.error('❌ Помилка скидання статусу генерації:', error)
  }
}