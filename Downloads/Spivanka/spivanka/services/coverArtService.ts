import { FormData } from '@/types'

// Для генерации обложек используем OpenAI Image API (GPT Image 1) для премиум плана
const OPENAI_API_KEY = process.env.NEXT_PUBLIC_OPENAI_API_KEY
const REPLICATE_API_KEY = process.env.NEXT_PUBLIC_REPLICATE_API_KEY

export async function generateCoverArt(formData: FormData, text: string, plan: 'basic' | 'premium', sunoCoverUrl?: string): Promise<string> {
  console.log(`🖼️ Початок генерації обкладинки для плану: ${plan}`)
  
  if (plan === 'premium') {
    // Для премиум плана генерируем обложку через OpenAI Image API
    console.log('🖼️ Генерую обкладинку через OpenAI Image API для преміум плану')
    
    // Проверяем API ключ
    if (!OPENAI_API_KEY || OPENAI_API_KEY === 'your-openai-api-key') {
      console.warn('⚠️ OpenAI API ключ не налаштований, використовую дефолтну обкладинку')
      return getDefaultCoverArt(formData)
    }
    
    try {
      const coverUrl = await generateWithOpenAIImage(formData, text)
      console.log('✅ Обкладинка успішно згенерована через OpenAI:', coverUrl)
      return coverUrl
    } catch (error) {
      console.error('❌ Помилка генерації обкладинки через OpenAI:', error)
      console.log('🔄 Використовую дефолтну обкладинку як fallback')
      return getDefaultCoverArt(formData)
    }
  } else {
    // Для базового плана используем обложку от Suno API (если есть) или дефолтную
    if (sunoCoverUrl) {
      console.log('🖼️ Використовую обкладинку від Suno API для базового плану:', sunoCoverUrl)
      return sunoCoverUrl
    } else {
      console.log('🖼️ Використовую дефолтну обкладинку для базового плану')
      return getDefaultCoverArt(formData)
    }
  }
}

function getDefaultCoverArt(formData: FormData): string {
  // Возвращаем дефолтную обложку в зависимости от стиля музыки
  const styleCovers: { [key: string]: string } = {
    'pop': 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop',
    'folk': 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&h=400&fit=crop',
    'ballad': 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop',
    'rock': 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop',
    'jazz': 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&h=400&fit=crop',
    'children': 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop'
  }
  
  return styleCovers[formData.musicStyle] || styleCovers['pop']
}

async function generateWithOpenAIImage(formData: FormData, text: string): Promise<string> {
  if (!OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY не налаштований')
    throw new Error('OPENAI_API_KEY не налаштований');
  }
  
  const prompt = createCoverPrompt(formData, text);
  console.log('🎨 OpenAI Image prompt:', prompt.substring(0, 200) + '...');
  
  try {
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
          body: JSON.stringify({
      model: "gpt-image-1", // Используем GPT Image 1 для генерации обложек
      prompt,
      n: 1,
      size: "1024x1024", // Квадратный формат
      quality: "medium" // Среднее качество
    })
    });
    
    console.log('📊 OpenAI API Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAI API Error:', errorText);
      
      // Определяем тип ошибки
      if (response.status === 401) {
        throw new Error('Невірний API ключ OpenAI');
      } else if (response.status === 429) {
        throw new Error('Перевищено ліміт запитів до OpenAI API');
      } else if (response.status === 400) {
        throw new Error('Невірний запит до OpenAI API');
      } else {
        throw new Error(`Помилка OpenAI API: ${response.status}`);
      }
    }
    
    const data = await response.json();
    console.log('✅ OpenAI GPT Image 1 response received');
    
    if (data.data && data.data[0]) {
      if (data.data[0].url) {
        console.log('🖼️ Отримано URL обкладинки:', data.data[0].url);
        return data.data[0].url;
      } else if (data.data[0].b64_json) {
        console.log('🖼️ Отримано обкладинку в base64 форматі');
        // Если пришло изображение в base64 — отправляем на сервер для получения url
        try {
          const uploadRes = await fetch(`${typeof window !== 'undefined' ? '' : 'http://localhost:3000'}/api/upload/cover`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ b64: `data:image/png;base64,${data.data[0].b64_json}`, ext: 'png' })
          })
          
          if (!uploadRes.ok) {
            throw new Error(`Upload failed: ${uploadRes.status}`);
          }
          
          const uploadData = await uploadRes.json()
          if (uploadData.url) {
            console.log('🖼️ Обкладинка завантажена на сервер:', uploadData.url);
            return uploadData.url
          }
        } catch (e) {
          console.error('❌ Ошибка загрузки обложки на сервер:', e)
        }
        // Fallback: возвращаем data URL
        console.log('🔄 Використовую data URL як fallback');
        return `data:image/png;base64,${data.data[0].b64_json}`;
      }
    }
    
    console.error('❌ Неочікувана відповідь від OpenAI GPT Image 1 API');
    throw new Error('Неочікувана відповідь від OpenAI GPT Image 1 API');
    
  } catch (error) {
    console.error('❌ Помилка запиту до OpenAI Image API:', error);
    throw error;
  }
}

async function generateWithStableDiffusion(formData: FormData, text: string): Promise<string> {
  if (!REPLICATE_API_KEY) {
    throw new Error('REPLICATE_API_KEY не налаштований')
  }

  const prompt = createCoverPrompt(formData, text)
  
  try {
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${REPLICATE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: "39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
        input: {
          prompt: prompt,
          width: 1024,
          height: 1024,
          num_outputs: 1,
          guidance_scale: 7.5,
          num_inference_steps: 50,
          scheduler: "K_EULER"
        }
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    const predictionId = data.id

    // Ожидаем завершения генерации
    const imageUrl = await waitForStableDiffusion(predictionId)
    return imageUrl

  } catch (error) {
    console.error('Помилка генерації обкладинки через Stable Diffusion:', error)
    throw error
  }
}

async function waitForStableDiffusion(predictionId: string): Promise<string> {
  const maxAttempts = 30 // Максимум 2.5 минуты (30 * 5 секунд)
  let attempts = 0

  while (attempts < maxAttempts) {
    try {
      const response = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
        headers: {
          'Authorization': `Token ${REPLICATE_API_KEY}`,
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.status === 'succeeded' && data.output && data.output.length > 0) {
        return data.output[0]
      } else if (data.status === 'failed') {
        throw new Error('Генерація обкладинки не вдалася')
      }

      // Ждем 5 секунд перед следующей проверкой
      await new Promise(resolve => setTimeout(resolve, 5000))
      attempts++

    } catch (error) {
      console.error('Помилка перевірки статусу генерації обкладинки:', error)
      attempts++
      await new Promise(resolve => setTimeout(resolve, 5000))
    }
  }

  throw new Error('Час очікування генерації обкладинки вичерпано')
}

function createCoverPrompt(formData: FormData, text: string): string {
  const styleMap: { [key: string]: string } = {
    'pop': 'modern, vibrant, colorful, contemporary',
    'folk': 'traditional, warm, rustic, handmade',
    'ballad': 'romantic, soft, elegant, dreamy',
    'rock': 'dynamic, bold, energetic, powerful',
    'jazz': 'sophisticated, classy, vintage, elegant',
    'children': 'playful, bright, cartoon-like, cheerful'
  }

  const moodMap: { [key: string]: string } = {
    'joyful': 'joyful, happy, celebratory, uplifting',
    'tender': 'tender, gentle, warm, heartfelt',
    'solemn': 'solemn, dignified, respectful, meaningful',
    'energetic': 'energetic, dynamic, vibrant, exciting'
  }

  const occasionMap: { [key: string]: string } = {
    'День народження': 'birthday celebration with cake, balloons, gifts, party decorations',
    'Весілля': 'wedding celebration with rings, flowers, champagne, romantic elements',
    'Ювілей': 'anniversary celebration with hearts, roses, romantic elements, golden accents',
    'Новий рік': 'New Year celebration with fireworks, champagne, festive elements, sparkles',
    'Річниця': 'anniversary with romantic symbols, hearts, flowers, love elements',
    'Випускний': 'graduation celebration with diploma, cap, academic symbols, achievement',
    'Хрестини': 'christening celebration with angel symbols, white flowers, peaceful elements, innocence'
  }

  const languageMap: { [key: string]: string } = {
    'uk': 'Ukrainian',
    'en': 'English',
    'ru': 'Russian'
  }

  const style = styleMap[formData.musicStyle] || 'modern'
  const mood = moodMap[formData.mood] || 'warm'
  const occasion = occasionMap[formData.occasion] || 'celebration'
  const language = languageMap[formData.greetingLanguage] || 'Ukrainian'

  // Создаем короткий текст для обложки
  const shortText = createShortText(formData, language)

  return `
Create a stunning, professional album cover for a personal greeting song with the following specifications:

THEME: ${occasion} celebration for ${formData.recipientName}
MUSIC STYLE: ${formData.musicStyle} genre with ${mood} atmosphere
LANGUAGE: ${language}

DESIGN REQUIREMENTS:
- Square format (1024x1024 pixels), ultra-high quality
- Include the text "${shortText}" prominently displayed in ${language} language
- Musical elements: floating musical notes, instruments, or musical symbols
- Celebration elements appropriate for ${formData.occasion}
- Color palette: warm, inviting colors that match the ${mood} mood
- Typography: elegant, readable font that complements the design
- Style: ${style} aesthetic with professional finish
- No human figures or faces
- Clean, modern composition suitable for a greeting card or album cover
- The text should be clearly readable and artistically integrated
- Subtle gradients and lighting effects for depth
- High contrast for readability while maintaining artistic appeal

TECHNICAL SPECIFICATIONS:
- Resolution: 1024x1024 pixels
- Quality: Ultra-high definition
- Style: Natural, photorealistic
- Composition: Balanced and visually appealing
- Text integration: Seamlessly blended with the design

The cover should capture the personal, heartfelt nature of the greeting while representing the musical style and celebration theme in a sophisticated, professional manner.
  `.trim()
}

function createShortText(formData: FormData, language: string): string {
  const shortTexts: { [key: string]: { [key: string]: string } } = {
    'uk': {
      'День народження': 'З Днем Народження!',
      'Весілля': 'З Днем Весілля!',
      'Ювілей': 'З Ювілеєм!',
      'Новий рік': 'З Новим Роком!',
      'Річниця': 'З Річницею!',
      'Випускний': 'З Випускним!',
      'Хрестини': 'З Хрестинами!'
    },
    'en': {
      'День народження': 'Happy Birthday!',
      'Весілля': 'Happy Wedding!',
      'Ювілей': 'Happy Anniversary!',
      'Новий рік': 'Happy New Year!',
      'Річниця': 'Happy Anniversary!',
      'Випускний': 'Happy Graduation!',
      'Хрестини': 'Happy Christening!'
    },
    'ru': {
      'День народження': 'С Днем Рождения!',
      'Весілля': 'С Днем Свадьбы!',
      'Ювілей': 'С Юбилеем!',
      'Новий рік': 'С Новым Годом!',
      'Річниця': 'С Годовщиной!',
      'Випускний': 'С Выпускным!',
      'Хрестини': 'С Крестинами!'
    }
  }

  const langTexts = shortTexts[language] || shortTexts['uk']
  return langTexts[formData.occasion] || langTexts['День народження']
} 