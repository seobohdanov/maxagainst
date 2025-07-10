'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { safeToast } from '@/lib/toast'
import type { Greeting } from '@/types'

interface ResultPageProps {
  params: Promise<{ taskId: string }>
}

export default function ResultPage({ params }: ResultPageProps) {
  const router = useRouter()
  const [taskId, setTaskId] = useState<string>('')
  const [greeting, setGreeting] = useState<Greeting | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Розпакування params
  useEffect(() => {
    const getParams = async () => {
      const resolvedParams = await params
      setTaskId(resolvedParams.taskId)
    }
    getParams()
  }, [params])

  // Завантаження даних привітання
  useEffect(() => {
    if (!taskId) return

    const loadGreeting = async () => {
      try {
        setLoading(true)
        
        // Спочатку пробуємо отримати статус генерації
        const statusResponse = await fetch(`/api/generate/music/save-status?taskId=${taskId}`)
        const statusData = await statusResponse.json()
        
        if (statusData.success && statusData.status === 'SUCCESS') {
          // Якщо статус SUCCESS, формуємо дані з generation_status
          
          // Получаем актуальные цены из настроек
          let basicPrice = 100;
          let premiumPrice = 200;
          
          try {
            const settingsResponse = await fetch('/api/admin/settings');
            if (settingsResponse.ok) {
              const settings = await settingsResponse.json();
              basicPrice = settings.basicPlanPrice || 100;
              premiumPrice = settings.premiumPlanPrice || 200;
            }
          } catch (settingsError) {
            console.log('⚠️ Не вдалося отримати налаштування, використовую дефолтні ціни');
          }
          
          const greetingData: Greeting = {
            id: taskId,
            taskId,
            recipientName: statusData.formData?.recipientName || '',
            occasion: statusData.formData?.occasion || '',
            relationship: statusData.formData?.relationship || '',
            personalDetails: statusData.formData?.personalDetails || '',
            musicStyle: statusData.formData?.musicStyle || '',
            mood: statusData.formData?.mood || '',
            greetingLanguage: statusData.formData?.greetingLanguage || 'uk',
            plan: statusData.formData?.plan || 'basic',
            text: statusData.text || '',
            musicUrl: statusData.musicUrl || '',
            secondMusicUrl: statusData.secondMusicUrl || '',
            coverUrl: statusData.coverUrl || '',
            status: statusData.status,
            allowSharing: false,
            userId: 'current-user',
            totalPrice: statusData.formData?.plan === 'premium' ? premiumPrice : basicPrice,
            paymentMethod: 'liqpay',
            createdAt: statusData.createdAt || new Date().toISOString(),
            updatedAt: statusData.updatedAt || new Date().toISOString()
          }
          
          setGreeting(greetingData)
        } else {
          // Якщо немає в generation_status, пробуємо з greetings
          const greetingResponse = await fetch(`/api/greetings/${taskId}`)
          const greetingData = await greetingResponse.json()
          
          if (greetingData.success) {
            setGreeting(greetingData.greeting)
          } else {
            setError('Привітання не знайдено')
          }
        }
      } catch (error) {
        console.error('❌ Помилка завантаження привітання:', error)
        setError('Помилка завантаження привітання')
      } finally {
        setLoading(false)
      }
    }

    loadGreeting()
  }, [taskId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-600 to-indigo-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Завантаження результату...</p>
        </div>
      </div>
    )
  }

  if (error || !greeting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-600 to-indigo-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Помилка</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-6 py-3 rounded-xl font-bold hover:shadow-lg transition-all"
          >
            Повернутись на головну
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-600 to-indigo-800 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Заголовок */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-3xl font-bold text-white mb-4">
            Ваше музичне привітання готове!
          </h1>
          <p className="text-white/80">
            Для {greeting.recipientName} з нагоди {greeting.occasion}
          </p>
        </div>

        {/* Основний контент */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 mb-8">
          {/* Обкладинка */}
          {greeting.coverUrl && (
            <div className="text-center mb-8">
              <img 
                src={greeting.coverUrl} 
                alt="Обкладинка привітання"
                className="w-64 h-64 mx-auto rounded-2xl shadow-lg object-cover"
              />
            </div>
          )}

          {/* Текст привітання */}
          <div className="mb-8">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Текст привітання:</h3>
            <div className="bg-gray-50 rounded-xl p-6 whitespace-pre-wrap text-gray-800">
              {greeting.text}
            </div>
          </div>

          {/* Музичні файли */}
          <div className="space-y-4 mb-8">
            <h3 className="text-xl font-bold text-gray-800">Музичні композиції:</h3>
            
            {greeting.musicUrl && (
              <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl p-4">
                <h4 className="font-semibold text-gray-700 mb-2">🎵 Основна композиція</h4>
                <audio controls className="w-full">
                  <source src={greeting.musicUrl} type="audio/mpeg" />
                  Ваш браузер не підтримує аудіо.
                </audio>
              </div>
            )}

            {greeting.secondMusicUrl && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4">
                <h4 className="font-semibold text-gray-700 mb-2">🎶 Альтернативна композиція</h4>
                <audio controls className="w-full">
                  <source src={greeting.secondMusicUrl} type="audio/mpeg" />
                  Ваш браузер не підтримує аудіо.
                </audio>
              </div>
            )}
          </div>

          {/* Інформація про замовлення */}
          <div className="bg-gray-50 rounded-xl p-6 mb-8">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Деталі замовлення:</h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <p><strong>Тариф:</strong> {greeting.plan === 'premium' ? 'Преміум' : 'Базовий'}</p>
                <p><strong>Стиль музики:</strong> {greeting.musicStyle}</p>
                <p><strong>Настрій:</strong> {greeting.mood}</p>
              </div>
              <div>
                <p><strong>Стосунки:</strong> {greeting.relationship}</p>
                <p><strong>Мова:</strong> {greeting.greetingLanguage === 'uk' ? 'Українська' : greeting.greetingLanguage}</p>
                <p><strong>Вартість:</strong> {greeting.totalPrice}₴</p>
              </div>
            </div>
          </div>

          {/* Дії */}
          <div className="flex flex-wrap gap-4 justify-center">
            <button
              onClick={() => {
                if (greeting.musicUrl) {
                  const link = document.createElement('a')
                  link.href = greeting.musicUrl
                  link.download = `greeting-${greeting.recipientName}.mp3`
                  link.click()
                }
              }}
              className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:shadow-lg transition-all"
            >
              📥 Завантажити музику
            </button>
            
            <button
              onClick={() => {
                const shareText = `Подивіться на це чудове музичне привітання для ${greeting.recipientName}!`
                if (navigator.share) {
                  navigator.share({
                    title: 'Музичне привітання',
                    text: shareText,
                    url: window.location.href
                  })
                } else {
                  navigator.clipboard.writeText(`${shareText} ${window.location.href}`)
                  safeToast.success('Посилання скопійовано!')
                }
              }}
              className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white px-6 py-3 rounded-xl font-bold hover:shadow-lg transition-all"
            >
              📤 Поділитись
            </button>
            
            <button
              onClick={() => router.push('/')}
              className="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-6 py-3 rounded-xl font-bold hover:shadow-lg transition-all"
            >
              🎵 Створити нове привітання
            </button>
          </div>
        </div>

        {/* Додаткова інформація */}
        <div className="text-center text-white/60 text-sm">
          <p>💝 Дякуємо, що обрали наш сервіс для створення музичних привітань!</p>
        </div>
      </div>
    </div>
  )
} 