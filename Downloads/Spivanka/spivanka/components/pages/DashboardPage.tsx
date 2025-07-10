'use client'

import React, { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { Session } from 'next-auth'
import { Greeting, CalendarEvent, Payment } from '@/types'
import { 
  Music, 
  Heart, 
  Download, 
  Share2, 
  Calendar, 
  User, 
  Star, 
  Settings, 
  Plus,
  Play,
  Pause,
  Trash2,
  Edit,
  Eye,
  Clock,
  TrendingUp,
  Award,
  ArrowLeft,
  RefreshCw,
  Globe,
  Sparkles
} from 'lucide-react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { safeToast } from '@/lib/toast'
import { CalendarEventsSection } from '@/components/CalendarEventsSection'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { useTranslation } from '@/hooks/useTranslation'
import Header from '@/components/Header'
import { UpcomingEvents } from '@/components/UpcomingEvents'

interface DashboardPageProps {
  session: Session | null
  userGreetings: Greeting[]
  calendarEvents: CalendarEvent[]
  onBack: () => void
  onCreateClick: () => void
  onGreetingDeleted?: (greetingId: string) => void
  onCreateFromCalendar?: (eventData: { recipientName: string; occasion: string; relationship?: string; isCustomOccasion?: boolean }) => void
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  session,
  userGreetings,
  calendarEvents,
  onBack,
  onCreateClick,
  onGreetingDeleted,
  onCreateFromCalendar
}) => {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<'greetings' | 'calendar' | 'payments' | 'statistics' | 'settings'>('greetings')
  const [playingGreeting, setPlayingGreeting] = useState<string | null>(null)
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null)
  const [greetings, setGreetings] = useState<Greeting[]>(userGreetings)
  const [generatingGreetings, setGeneratingGreetings] = useState<any[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [payments, setPayments] = useState<Payment[]>([])
  const [isLoadingPayments, setIsLoadingPayments] = useState(false)

  // Обработка URL параметров для установки активной вкладки и автоматической синхронизации
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const activeTabParam = urlParams.get('activeTab')
    const calendarConnected = urlParams.get('calendar_connected')
    
    if (activeTabParam && ['greetings', 'calendar', 'payments', 'statistics', 'settings'].includes(activeTabParam)) {
      setActiveTab(activeTabParam as 'greetings' | 'calendar' | 'payments' | 'statistics' | 'settings')
      console.log('📋 Установлена активная вкладка из URL:', activeTabParam)
    }
    
    // Автоматическая синхронизация календаря после подключения
    if (calendarConnected === 'true') {
      console.log('📅 Календарь подключен, запускаю автоматическую синхронизацию...')
      
      // Запускаем синхронизацию через небольшую задержку
      setTimeout(async () => {
        try {
          const response = await fetch('/api/calendar/cache', { method: 'POST' })
          if (response.ok) {
            const data = await response.json()
            console.log('✅ Автоматическая синхронизация календаря завершена:', data.eventsCount, 'событий')
            safeToast.success(`Календарь синхронізовано: ${data.eventsCount} подій`)
          } else {
            console.error('❌ Ошибка автоматической синхронизации календаря')
          }
        } catch (error) {
          console.error('❌ Ошибка автоматической синхронизации календаря:', error)
        }
      }, 1000) // Задержка 1 секунда
      
      // Очищаем URL параметры
      window.history.replaceState({}, '', window.location.pathname + '?activeTab=calendar')
    }
  }, [])

  // Загружаем генерирующиеся поздравления
  const loadGeneratingGreetings = async () => {
    try {
      const response = await fetch('/api/generate/music/status')
      if (response.ok) {
        const data = await response.json()
        if (data.success && Array.isArray(data.statuses)) {
          // Фильтруем только незавершенные задачи текущего пользователя, включая PENDING
          const userGenerating = data.statuses.filter((status: any) => 
            status.status !== 'SUCCESS' && 
            status.status !== 'FAILED' && 
            status.status !== 'GENERATE_AUDIO_FAILED' &&
            (status.formData?.recipientName || status.status === 'PENDING') // Включаем PENDING даже без formData
          )
          setGeneratingGreetings(userGenerating)
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки генерирующихся поздравлений:', error)
    }
  }

  // Загружаем платежи пользователя
  const loadPayments = async () => {
    if (!session?.user?.email) return
    
    setIsLoadingPayments(true)
    try {
      const response = await fetch('/api/payments')
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setPayments(data.payments || [])
        }
      } else {
        console.error('Ошибка загрузки платежей:', response.status)
      }
    } catch (error) {
      console.error('Ошибка загрузки платежей:', error)
    } finally {
      setIsLoadingPayments(false)
    }
  }

  useEffect(() => {
    // Загружаем данные только при первом заходе
    loadGeneratingGreetings()
    loadPayments()
  }, [])

  // Отдельный useEffect для интервала, который работает только на вкладке "Привітання"
  useEffect(() => {
    if (activeTab === 'greetings') {
      // Обновляем каждые 10 секунд только на вкладке поздравлений
      const interval = setInterval(loadGeneratingGreetings, 10000)
      return () => clearInterval(interval)
    }
  }, [activeTab])

  // Функция принудительного обновления данных
  const handleRefresh = async () => {
    setIsRefreshing(true)
    console.log('🔄 Принудительное обновление данных дашборда...')
    
    try {
      // Обновляем генерирующиеся поздравления
      await loadGeneratingGreetings()
      
      // Обновляем готовые поздравления через родительский компонент
      // (это будет сделано автоматически через useEffect в родительском компоненте)
      
      safeToast.success('Дані оновлено!')
    } catch (error) {
      console.error('Ошибка обновления данных:', error)
      safeToast.error('Помилка оновлення даних')
    } finally {
      setIsRefreshing(false)
    }
  }

  // Обновляем локальное состояние при изменении пропсов
  useEffect(() => {
    console.log('🔄 Dashboard: обновление данных из API')
    setGreetings(userGreetings)
    
    // Отладочная информация
    if (userGreetings.length > 0) {
      console.log('🔍 Dashboard: получено поздравлений:', userGreetings.length)
      userGreetings.forEach((greeting, index) => {
        console.log(`🔍 Greeting ${index}:`, {
          id: greeting.id,
          recipientName: greeting.recipientName,
          text: greeting.text?.substring(0, 50) + '...',
          status: greeting.status,
          createdAt: greeting.createdAt
        })
      })
    } else {
      console.log('🔍 Dashboard: поздравлений не найдено')
    }
  }, [userGreetings])

  // Фильтруем поздравления: только завершенные (SUCCESS) отображаются как постоянные карточки
  const completedGreetings = greetings.filter(greeting => greeting.status === 'SUCCESS')
  
  // Объединяем генерирующиеся поздравления с незавершенными из основного списка
  const allGeneratingGreetings = [
    ...generatingGreetings,
    ...greetings.filter(greeting => 
      greeting.status && 
      greeting.status !== 'SUCCESS' && 
      greeting.status !== 'FAILED' && 
      greeting.status !== 'GENERATE_AUDIO_FAILED'
    )
  ]
  
    // Убираем дубликаты по taskId
  const uniqueGeneratingGreetings = allGeneratingGreetings.filter((greeting, index, array) => 
    array.findIndex(g => (g.taskId || g.id) === (greeting.taskId || greeting.id)) === index
  )

  // Функция для получения статистики (после определения completedGreetings)
  const getGreetingStats = () => {
    // Считаем статистику только по завершенным поздравлениям
    const total = completedGreetings.length
    const premium = completedGreetings.filter(g => g.plan === 'premium').length
    const basic = completedGreetings.filter(g => g.plan === 'basic').length
    const totalSpent = completedGreetings.reduce((sum, g) => sum + (g.totalPrice || 0), 0)
    
    return { total, premium, basic, totalSpent }
  }

  const stats = getGreetingStats()

  

  const handlePlayPause = async (greetingId: string, musicUrl: string) => {
    if (playingGreeting === greetingId) {
      // Остановить воспроизведение
      if (audioRef) {
        audioRef.pause()
        audioRef.currentTime = 0
      }
      setPlayingGreeting(null)
      setAudioRef(null)
    } else {
      // Начать воспроизведение
      if (audioRef) {
        audioRef.pause()
      }
      
      try {
        const audio = new Audio(musicUrl)
        
        // Ждем загрузки аудио
        await new Promise((resolve, reject) => {
          audio.addEventListener('canplaythrough', resolve)
          audio.addEventListener('error', reject)
          audio.load()
        })
        
        await audio.play()
        setAudioRef(audio)
        setPlayingGreeting(greetingId)
        
        audio.onended = () => {
          setPlayingGreeting(null)
          setAudioRef(null)
        }
        
        audio.onerror = () => {
          console.error('Ошибка воспроизведения аудио')
          setPlayingGreeting(null)
          setAudioRef(null)
        }
      } catch (error) {
        console.error('Ошибка загрузки аудио:', error)
        setPlayingGreeting(null)
        setAudioRef(null)
      }
    }
  }

  const handleDownload = (musicUrl: string, recipientName: string) => {
    const link = document.createElement('a')
    link.href = musicUrl
    link.download = `greeting_${recipientName}_${Date.now()}.mp3`
    link.click()
  }

  const handleShare = (greeting: Greeting) => {
    if (navigator.share) {
      navigator.share({
        title: `Привітання для ${safeValue(greeting.recipientName)}`,
        text: `Послухайте персональне привітання для ${safeValue(greeting.recipientName)}!`,
        url: window.location.href
      })
    } else {
      // Fallback для браузеров без поддержки Web Share API
      navigator.clipboard.writeText(window.location.href)
      alert('Посилання скопійовано в буфер обміну!')
    }
  }

  const handleDelete = async (greetingId: string) => {
    if (confirm('Ви впевнені, що хочете видалити це привітання?')) {
      try {
        const response = await fetch(`/api/greetings/${greetingId}`, {
          method: 'DELETE'
        })

        if (response.ok) {
          // Удаляем из локального состояния
          setGreetings(prev => prev.filter(g => g.id !== greetingId))
          // Уведомляем родительский компонент об удалении
          onGreetingDeleted?.(greetingId)
          safeToast.success('Привітання успішно видалено')
        } else {
          const data = await response.json()
          safeToast.error(data.error || 'Помилка видалення привітання')
        }
      } catch (error) {
        console.error('Error deleting greeting:', error)
        safeToast.error('Помилка видалення привітання')
      }
    }
  }

  const handleCleanup = async () => {
    if (confirm('Ви впевнені, що хочете очистити старі незавершені записи?')) {
      try {
        const response = await fetch('/api/greetings/cleanup', {
          method: 'POST'
        })

        if (response.ok) {
          const data = await response.json()
          safeToast.success(data.message || 'Очищення завершено')
          
          // Обновляем список приветствий
          const greetingsResponse = await fetch('/api/greetings')
          if (greetingsResponse.ok) {
            const greetingsData = await greetingsResponse.json()
            setGreetings(greetingsData.greetings || [])
          }
        } else {
          const data = await response.json()
          safeToast.error(data.error || 'Помилка очищення')
        }
      } catch (error) {
        console.error('Error cleaning up:', error)
        safeToast.error('Помилка очищення')
      }
    }
  }

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return dateObj.toLocaleDateString('uk-UA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }



  // Безопасная функция для вывода текста
  const safeText = (text: any) => {
    if (typeof text === 'string') return text
    if (text == null) return ''
    try {
      return JSON.stringify(text)
    } catch {
      return String(text)
    }
  }

  // Безопасная функция для вывода любого значения
  const safeValue = (value: any) => {
    if (typeof value === 'string' || typeof value === 'number') return value
    if (value == null) return ''
    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }

  // Функция для получения информации о статусе
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'PENDING':
        return { title: 'Підготовка', color: 'bg-blue-500', progress: 15 }
      case 'TEXT_SUCCESS':
        return { title: 'Текст готовий', color: 'bg-green-500', progress: 45 }
      case 'FIRST_SUCCESS':
        return { title: 'Створення музики', color: 'bg-purple-500', progress: 75 }
      case 'SUCCESS':
        return { title: 'Готово', color: 'bg-green-600', progress: 100 }
      default:
        return { title: 'Обробка', color: 'bg-gray-500', progress: 5 }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50">
      {/* Header */}
      <Header 
        session={session}
        showBackButton={true}
        backButtonText="Головна"
        onBackClick={onBack}
        pageTitle="📊 Особистий кабінет"
        onCreateClick={() => window.location.href = '/create'}
        onExamplesClick={() => window.location.href = '/examples'}
        onSignOut={() => signOut({ callbackUrl: '/' })}
        variant="light"
      />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">

        {/* User Info - адаптивная для мобильных */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8 shadow-sm">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-pink-100 to-purple-100 rounded-full flex items-center justify-center">
              <User size={24} className="sm:w-8 sm:h-8 text-gray-600" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 truncate">
                {session?.user?.name || 'Користувач'}
              </h2>
              <p className="text-sm sm:text-base text-gray-600 truncate">{session?.user?.email}</p>
            </div>
          </div>
          
          {/* Ближайшие события из календаря */}
          {session?.user?.email && (
            <UpcomingEvents 
              userEmail={session.user.email} 
              onCreateFromEvent={(eventData) => {
                if (onCreateFromCalendar) {
                  onCreateFromCalendar(eventData)
                } else {
                  onCreateClick()
                }
              }}
            />
          )}
        </div>

        {/* Tabs - адаптивные для мобильных */}
        <div className="bg-white rounded-2xl p-2 mb-8 shadow-sm">
          {/* Мобильная версия табов - сетка 2x3 */}
          <div className="block sm:hidden">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setActiveTab('greetings')}
                className={`py-3 px-2 rounded-lg font-medium text-xs transition-all text-center ${
                  activeTab === 'greetings'
                    ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-800 bg-gray-50'
                }`}
              >
                <div className="text-lg mb-1">🎵</div>
                <div className="leading-tight">
                  Привітання<br/>({completedGreetings.length + uniqueGeneratingGreetings.length})
                </div>
              </button>
              <button
                onClick={() => setActiveTab('calendar')}
                className={`py-3 px-2 rounded-lg font-medium text-xs transition-all text-center ${
                  activeTab === 'calendar'
                    ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-800 bg-gray-50'
                }`}
              >
                <div className="text-lg mb-1">📅</div>
                <div className="leading-tight">Календар</div>
              </button>
              <button
                onClick={() => {
                  setActiveTab('payments')
                  if (payments.length === 0 && !isLoadingPayments) {
                    loadPayments()
                  }
                }}
                className={`py-3 px-2 rounded-lg font-medium text-xs transition-all text-center ${
                  activeTab === 'payments'
                    ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-800 bg-gray-50'
                }`}
              >
                <div className="text-lg mb-1">💳</div>
                <div className="leading-tight">
                  Платежі<br/>({payments.length})
                </div>
              </button>
              <button
                onClick={() => setActiveTab('statistics')}
                className={`py-3 px-2 rounded-lg font-medium text-xs transition-all text-center ${
                  activeTab === 'statistics'
                    ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-800 bg-gray-50'
                }`}
              >
                <div className="text-lg mb-1">📊</div>
                <div className="leading-tight">Статистика</div>
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`py-3 px-2 rounded-lg font-medium text-xs transition-all text-center col-span-2 ${
                  activeTab === 'settings'
                    ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-800 bg-gray-50'
                }`}
              >
                <div className="text-lg mb-1">⚙️</div>
                <div className="leading-tight">Налаштування</div>
              </button>
            </div>
          </div>

          {/* Десктопная версия табов */}
          <div className="hidden sm:flex gap-2">
            <button
              onClick={() => setActiveTab('greetings')}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${
                activeTab === 'greetings'
                  ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {t('dashboard.greetings')} ({completedGreetings.length + uniqueGeneratingGreetings.length})
            </button>
            <button
              onClick={() => setActiveTab('calendar')}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${
                activeTab === 'calendar'
                  ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {t('dashboard.calendar')}
            </button>
            <button
              onClick={() => {
                setActiveTab('payments')
                if (payments.length === 0 && !isLoadingPayments) {
                  loadPayments()
                }
              }}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${
                activeTab === 'payments'
                  ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {t('dashboard.payments')} ({payments.length})
            </button>
            <button
              onClick={() => setActiveTab('statistics')}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${
                activeTab === 'statistics'
                  ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {t('dashboard.statistics')}
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${
                activeTab === 'settings'
                  ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {t('dashboard.settings')}
            </button>
          </div>
        </div>

        {/* Content - адаптивный отступ */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 lg:p-8 shadow-sm">
          {activeTab === 'calendar' && (
            <CalendarEventsSection
              onCreateGreeting={(eventData) => {
                if (onCreateFromCalendar) {
                  onCreateFromCalendar(eventData)
                } else {
                  // Перенаправляем на страницу создания с данными события
                  localStorage.setItem('calendarEventData', JSON.stringify(eventData))
                  window.location.href = '/create'
                }
              }}
            />
          )}
          
          {activeTab === 'greetings' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-800">{t('dashboard.myGreetings')}</h2>
                  <div className="text-sm text-gray-600 mt-1 sm:hidden">
                    {completedGreetings.length} готових{uniqueGeneratingGreetings.length > 0 && `, ${uniqueGeneratingGreetings.length} генерується`}
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
                  <div className="hidden sm:block text-sm text-gray-600">
                    {completedGreetings.length} готових{uniqueGeneratingGreetings.length > 0 && `, ${uniqueGeneratingGreetings.length} генерується`}
                  </div>
                  
                  {/* Мобильная версия кнопок */}
                  <div className="flex gap-2 sm:hidden">
                    <button
                      onClick={handleRefresh}
                      disabled={isRefreshing}
                      className="flex-1 bg-blue-500 text-white px-3 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-1 text-sm disabled:opacity-50"
                      title="Оновити дані"
                    >
                      <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
                      {t('dashboard.refresh')}
                    </button>
                    <button
                      onClick={handleCleanup}
                      className="flex-1 bg-gray-500 text-white px-3 py-2 rounded-lg hover:bg-gray-600 transition-colors flex items-center justify-center gap-1 text-sm"
                      title="Очистити старі записи"
                    >
                      <Trash2 size={14} />
                      {t('dashboard.cleanup')}
                    </button>
                    <Link
                      href="/examples"
                      className="flex-1 bg-green-500 text-white px-3 py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-1 text-sm"
                      title="Переглянути публічні приклади"
                    >
                      <Eye size={14} />
                      {t('dashboard.examples')}
                    </Link>
                  </div>

                  {/* Десктопная версия кнопок */}
                  <div className="hidden sm:flex items-center gap-4">
                    <button
                      onClick={handleRefresh}
                      disabled={isRefreshing}
                      className="bg-blue-500 text-white px-3 py-1 rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-1 text-sm disabled:opacity-50"
                      title="Оновити дані"
                    >
                      <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
                      {t('dashboard.refresh')}
                    </button>
                    <button
                      onClick={handleCleanup}
                      className="bg-gray-500 text-white px-3 py-1 rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-1 text-sm"
                      title="Очистити старі записи"
                    >
                      <Trash2 size={14} />
                      {t('dashboard.cleanup')}
                    </button>
                    <Link
                      href="/examples"
                      className="bg-green-500 text-white px-3 py-1 rounded-lg hover:bg-green-600 transition-colors flex items-center gap-1 text-sm"
                      title="Переглянути публічні приклади"
                    >
                      <Eye size={14} />
                      {t('dashboard.examples')}
                    </Link>
                  </div>
                </div>
              </div>

              {completedGreetings.length === 0 && uniqueGeneratingGreetings.length === 0 ? (
                <div className="text-center py-12">
                  <Music size={64} className="mx-auto text-gray-300 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-600 mb-2">
                    {t('dashboard.noGreetingsYet')}
                  </h3>
                  <p className="text-gray-500 mb-6">
                    {t('dashboard.createFirstGreeting')}
                  </p>
                  <button
                    onClick={onCreateClick}
                    className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-8 py-3 rounded-full hover:shadow-lg transition-all"
                  >
                    {t('dashboard.createGreetingButton')}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {/* Генерирующиеся поздравления с прогресс-баром */}
                  {uniqueGeneratingGreetings.map((generatingItem) => {
                    const statusInfo = getStatusInfo(generatingItem.status)
                    return (
                      <div
                        key={generatingItem.taskId}
                        className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-4 sm:p-6 border-2 border-yellow-200 relative overflow-hidden"
                      >
                        {/* Анимированный фон */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                        
                        {/* Cover Art Placeholder */}
                        <div className="aspect-square bg-gradient-to-br from-yellow-100 to-orange-100 rounded-xl overflow-hidden mb-4 relative">
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
                          </div>
                          {/* Status Badge */}
                          <div className="absolute top-2 left-2">
                            <span className={`${statusInfo.color} text-white text-xs px-2 py-1 rounded-full font-semibold`}>
                              {statusInfo.title}
                            </span>
                          </div>
                        </div>

                        {/* Info */}
                        <div className="space-y-3 relative z-10">
                          <div>
                            <h3 className="font-semibold text-gray-800 mb-1">
                              Для: {safeValue(generatingItem.formData?.recipientName || generatingItem.recipientName || 'Невідомо')}
                            </h3>
                            <p className="text-sm text-gray-600">{safeValue(generatingItem.formData?.occasion || generatingItem.occasion || 'Генерація...')}</p>
                          </div>

                          {/* Progress Bar */}
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`${statusInfo.color} h-2 rounded-full transition-all duration-500`}
                              style={{ width: `${statusInfo.progress}%` }}
                            ></div>
                          </div>
                          <div className="text-xs text-gray-500 text-center">
                            {statusInfo.progress}% завершено
                          </div>

                          {/* Деталі */}
                          <div className="text-xs text-gray-500 space-y-1">
                            <div><b>Стиль:</b> {safeValue(generatingItem.formData?.musicStyle || generatingItem.musicStyle || 'Невідомо')}</div>
                            <div><b>Настрій:</b> {safeValue(generatingItem.formData?.mood || generatingItem.mood || 'Невідомо')}</div>
                            <div><b>Мова:</b> {safeValue(generatingItem.formData?.greetingLanguage || generatingItem.greetingLanguage || 'Невідомо')}</div>
                          </div>

                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Clock size={16} />
                            <span>Генерується...</span>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2 pt-3 border-t border-yellow-200">
                            <Link
                              href={`/greeting/${generatingItem.taskId}`}
                              className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-white p-2 rounded-lg hover:shadow-md transition-all text-center font-semibold text-sm"
                            >
                              Переглянути процес
                            </Link>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  
                  {/* Завершенные поздравления (постоянные карточки) */}
                  {completedGreetings.map((greeting) => (
                    <div
                      key={greeting.id}
                      className="bg-white rounded-2xl p-4 sm:p-6 hover:shadow-lg transition-all border border-gray-200 shadow-sm"
                    >
                                              {/* Cover Art with Link */}
                        <Link href={`/greeting/${greeting.taskId || greeting.id}`} className="block">
                          <div className="aspect-square bg-gradient-to-br from-pink-100 to-purple-100 rounded-xl overflow-hidden mb-4 relative group cursor-pointer">
                            {greeting.coverUrl && greeting.coverUrl.length > 0 ? (
                              <img 
                                src={greeting.coverUrl} 
                                alt="Обкладинка"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                onError={(e) => {
                                  console.log('❌ Помилка завантаження обкладинки:', greeting.coverUrl)
                                  e.currentTarget.style.display = 'none'
                                  e.currentTarget.nextElementSibling?.classList.remove('hidden')
                                }}
                              />
                            ) : null}
                            <div className={`w-full h-full flex items-center justify-center ${greeting.coverUrl && greeting.coverUrl.length > 0 ? 'hidden' : ''}`}>
                              <Music className="text-gray-400" size={48} />
                            </div>
                            {/* Overlay */}
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <div className="bg-white/90 text-gray-800 px-4 py-2 rounded-full font-semibold">
                                Переглянути
                              </div>
                            </div>
                          </div>
                        </Link>

                      {/* Info */}
                      <div className="space-y-3">
                        <div>
                          <h3 className="font-semibold text-gray-800 mb-1">
                            Для: {safeValue(greeting.recipientName)}
                          </h3>
                          <p className="text-sm text-gray-600">{safeValue(greeting.occasion)}</p>
                        </div>

                        {/* Новый блок с деталями */}
                        <div className="text-xs text-gray-500 space-y-1">
                          <div><b>Стиль:</b> {safeValue(greeting.musicStyle)}</div>
                          <div><b>Настрій:</b> {safeValue(greeting.mood)}</div>
                          <div><b>Мова:</b> {safeValue(greeting.greetingLanguage)}</div>
                          {greeting.personalDetails && 
                           greeting.personalDetails !== '{}' && 
                           greeting.personalDetails !== 'null' && 
                           greeting.personalDetails !== '' && 
                           <div><b>Деталі:</b> {safeValue(greeting.personalDetails)}</div>}
                        </div>

                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Calendar size={16} />
                          <span>{formatDate(greeting.createdAt)}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${
                            greeting.plan === 'premium' 
                              ? 'bg-yellow-100 text-yellow-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {greeting.plan === 'premium' ? (
                              <>
                                <Star className="w-3 h-3" />
                                Premium
                              </>
                            ) : (
                              <>
                                <Music className="w-3 h-3" />
                                Basic
                              </>
                            )}
                          </span>
                          {greeting.allowSharing && (
                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 flex items-center gap-1">
                              <Globe className="w-3 h-3" />
                              Публічне
                            </span>
                          )}
                        </div>

                        {/* Actions - адаптивные для мобильных */}
                        <div className="pt-3 border-t border-gray-200">
                          {/* Мобильная версия - кнопки в колонку */}
                          <div className="flex flex-col gap-2 sm:hidden">
                            <Link
                              href={`/greeting/${greeting.taskId || greeting.id}`}
                              className="bg-gradient-to-r from-pink-500 to-purple-600 text-white py-2 px-4 rounded-lg hover:shadow-md transition-all text-center font-semibold text-sm flex items-center justify-center gap-1"
                            >
                              <Eye className="w-4 h-4" />
                              Переглянути
                            </Link>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleDownload(greeting.musicUrl || '', String(safeValue(greeting.recipientName)))}
                                className="flex-1 bg-blue-500 text-white py-2 px-3 rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium flex items-center justify-center gap-1"
                                title="Скачати"
                              >
                                <Download className="w-4 h-4" />
                                Скачати
                              </button>
                              <button
                                onClick={() => handleShare(greeting)}
                                className="flex-1 bg-green-500 text-white py-2 px-3 rounded-lg hover:bg-green-600 transition-colors text-sm font-medium flex items-center justify-center gap-1"
                                title="Поділитися"
                              >
                                <Share2 className="w-4 h-4" />
                                Поділитися
                              </button>
                              <button
                                onClick={() => handleDelete(greeting.id)}
                                className="flex-1 bg-red-500 text-white py-2 px-3 rounded-lg hover:bg-red-600 transition-colors text-sm font-medium flex items-center justify-center gap-1"
                                title="Видалити"
                              >
                                <Trash2 className="w-4 h-4" />
                                Видалити
                              </button>
                            </div>
                          </div>

                          {/* Десктопная версия - кнопки в ряд */}
                          <div className="hidden sm:flex gap-2">
                            <Link
                              href={`/greeting/${greeting.taskId || greeting.id}`}
                              className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 text-white p-2 rounded-lg hover:shadow-md transition-all text-center font-semibold text-sm"
                            >
                              Переглянути
                            </Link>
                            <button
                              onClick={() => handleDownload(greeting.musicUrl || '', String(safeValue(greeting.recipientName)))}
                              className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                              title="Скачати"
                            >
                              <Download size={16} />
                            </button>
                            <button
                              onClick={() => handleShare(greeting)}
                              className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                              title="Поділитися"
                            >
                              <Share2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(greeting.id)}
                              className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                              title="Видалити"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="space-y-4 sm:space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Мої платежі</h2>
                  <div className="text-sm text-gray-600 sm:hidden">
                    Всього: {payments.reduce((sum, p) => sum + (p.amount || 0), 0)} ₴
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="hidden sm:block text-sm text-gray-600">
                    Всього: {payments.reduce((sum, p) => sum + (p.amount || 0), 0)} ₴
                  </div>
                  <button
                    onClick={loadPayments}
                    disabled={isLoadingPayments}
                    className="bg-blue-500 text-white px-3 py-2 sm:py-1 rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-1 text-sm disabled:opacity-50 w-full sm:w-auto justify-center"
                    title="Оновити платежі"
                  >
                    <RefreshCw size={14} className={isLoadingPayments ? 'animate-spin' : ''} />
                    Оновити
                  </button>
                </div>
              </div>

              {isLoadingPayments ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Завантаження платежів...</p>
                </div>
              ) : payments.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    💳
                  </div>
                  <h3 className="text-xl font-semibold text-gray-600 mb-2">
                    Поки немає платежів
                  </h3>
                  <p className="text-gray-500 mb-6">
                    Ваші платежі за привітання з'являться тут
                  </p>
                  <button
                    onClick={onCreateClick}
                    className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-8 py-3 rounded-full hover:shadow-lg transition-all"
                  >
                    Створити перше привітання
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200 hover:shadow-md transition-shadow"
                    >
                      {/* Мобильная версия - вертикальная */}
                      <div className="block sm:hidden space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center">
                            💰
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-800 truncate">
                              {payment.description || `Платеж ${payment.plan || 'basic'}`}
                            </h3>
                            <p className="text-sm text-gray-600 truncate">
                              {payment.recipientName && `Для: ${payment.recipientName}`}
                              {payment.occasion && ` • ${payment.occasion}`}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="text-left">
                            <div className="text-xl font-bold text-gray-800">
                              {payment.amount} ₴
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatDate(payment.createdAt)}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              payment.status === 'success' 
                                ? 'bg-green-100 text-green-800' 
                                : payment.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {payment.status === 'success' ? '✅ Успішно' : 
                               payment.status === 'pending' ? '⏳ В обробці' : 
                               '❌ Помилка'}
                            </span>
                            <div className="text-xs text-gray-400 mt-1">
                              {payment.paymentMethod === 'fondy' ? 'Fondy' : 
                               payment.paymentMethod === 'liqpay' ? 'LiqPay' : 
                               payment.paymentMethod}
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-xs text-gray-500 pt-2 border-t border-gray-100">
                          ID: {payment.orderId || payment.transactionId || payment.id}
                        </div>
                      </div>

                      {/* Десктопная версия - горизонтальная */}
                      <div className="hidden sm:flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center">
                            💰
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-800">
                              {payment.description || `Платеж ${payment.plan || 'basic'}`}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {payment.recipientName && `Для: ${payment.recipientName}`}
                              {payment.occasion && ` • ${payment.occasion}`}
                            </p>
                            <p className="text-xs text-gray-500">
                              ID: {payment.orderId || payment.transactionId || payment.id}
                            </p>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-2xl font-bold text-gray-800">
                              {payment.amount} ₴
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              payment.status === 'success' 
                                ? 'bg-green-100 text-green-800' 
                                : payment.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {payment.status === 'success' ? '✅ Успішно' : 
                               payment.status === 'pending' ? '⏳ В обробці' : 
                               '❌ Помилка'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500">
                            {formatDate(payment.createdAt)}
                          </p>
                          <p className="text-xs text-gray-400">
                            {payment.paymentMethod === 'fondy' ? 'Fondy' : 
                             payment.paymentMethod === 'liqpay' ? 'LiqPay' : 
                             payment.paymentMethod}
                          </p>
                        </div>
                      </div>
                      
                      {payment.plan && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <div className="flex items-center gap-2">
                            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                              payment.plan === 'premium' 
                                ? 'bg-yellow-100 text-yellow-800' 
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {payment.plan === 'premium' ? '⭐ Premium план' : '🎵 Basic план'}
                            </span>
                            {payment.taskId && (
                              <Link
                                href={`/greeting/${payment.taskId}`}
                                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                              >
                                Переглянути привітання →
                              </Link>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'statistics' && (
            <div className="space-y-8">
              <h2 className="text-2xl font-bold text-gray-800">Статистика</h2>
              
              {/* Stats Cards - адаптивная сетка */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-3 sm:p-6 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-xs sm:text-sm">Всього привітань</p>
                      <p className="text-xl sm:text-3xl font-bold">{stats.total}</p>
                    </div>
                    <Music size={24} className="sm:w-8 sm:h-8 opacity-80" />
                  </div>
                </div>

                <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white p-3 sm:p-6 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-yellow-100 text-xs sm:text-sm">Premium</p>
                      <p className="text-xl sm:text-3xl font-bold">{stats.premium}</p>
                    </div>
                    <Star size={24} className="sm:w-8 sm:h-8 opacity-80" />
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-3 sm:p-6 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-xs sm:text-sm">Basic</p>
                      <p className="text-xl sm:text-3xl font-bold">{stats.basic}</p>
                    </div>
                    <Award size={24} className="sm:w-8 sm:h-8 opacity-80" />
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-3 sm:p-6 rounded-2xl col-span-2 lg:col-span-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100 text-xs sm:text-sm">Витрачено</p>
                      <p className="text-xl sm:text-3xl font-bold">{stats.totalSpent}₴</p>
                    </div>
                    <TrendingUp size={24} className="sm:w-8 sm:h-8 opacity-80" />
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-gray-50 rounded-2xl p-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Остання активність</h3>
                {greetings.slice(0, 5).map((greeting) => (
                  <div key={greeting.id} className="flex items-center justify-between py-3 border-b border-gray-200 last:border-b-0">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-pink-100 to-purple-100 rounded-full flex items-center justify-center">
                        <Music size={20} className="text-gray-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">Привітання для {safeValue(greeting.recipientName)}</p>
                        <p className="text-sm text-gray-600">{safeValue(greeting.occasion)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">{formatDate(greeting.createdAt)}</p>
                      <p className="text-xs text-gray-500">{safeValue(greeting.plan)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-4 sm:space-y-8">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Налаштування акаунту</h2>
              
              {/* Profile Settings */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4 sm:p-6 border border-blue-100">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <User size={20} className="sm:w-6 sm:h-6 text-blue-600" />
                  Профіль користувача
                </h3>
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    {session?.user?.image && (
                      <img 
                        src={session.user.image} 
                        alt="Profile" 
                        className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border-2 border-blue-200 self-center sm:self-start"
                      />
                    )}
                    <div className="flex-1 space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Ім'я
                        </label>
                        <input
                          type="text"
                          defaultValue={session?.user?.name || ''}
                          className="w-full px-3 py-2 sm:px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm sm:text-base"
                          placeholder="Ваше ім'я"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Email
                        </label>
                        <input
                          type="email"
                          defaultValue={session?.user?.email || ''}
                          className="w-full px-3 py-2 sm:px-4 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 text-sm sm:text-base"
                          placeholder="your@email.com"
                          disabled
                        />
                        <p className="text-xs text-gray-500 mt-1">Email не можна змінити</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Account Statistics */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-4 sm:p-6 border border-green-100">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <TrendingUp size={20} className="sm:w-6 sm:h-6 text-green-600" />
                  Статистика акаунту
                </h3>
                <div className="grid grid-cols-3 gap-2 sm:gap-4">
                  <div className="bg-white rounded-lg p-3 sm:p-4 text-center">
                    <div className="text-lg sm:text-2xl font-bold text-blue-600">{greetings.length}</div>
                    <div className="text-xs sm:text-sm text-gray-600">Привітань</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 sm:p-4 text-center">
                    <div className="text-lg sm:text-2xl font-bold text-green-600">{payments.length}</div>
                    <div className="text-xs sm:text-sm text-gray-600">Платежів</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 sm:p-4 text-center">
                    <div className="text-lg sm:text-2xl font-bold text-purple-600">
                      {new Date().getFullYear()}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600">Рік реєстрації</div>
                  </div>
                </div>
              </div>

              {/* Account Actions */}
              <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl p-4 sm:p-6 border border-orange-100">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Settings size={20} className="sm:w-6 sm:h-6 text-orange-600" />
                  Дії з акаунтом
                </h3>
                <div className="space-y-4">
                  <div className="bg-white rounded-lg p-3 sm:p-4 border border-orange-200">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-800 text-sm sm:text-base">Експортувати дані</h4>
                        <p className="text-xs sm:text-sm text-gray-600">Завантажити всі ваші дані у форматі JSON</p>
                      </div>
                      <button 
                        onClick={async () => {
                          try {
                            const response = await fetch('/api/user/export')
                            if (response.ok) {
                              const blob = await response.blob()
                              const url = window.URL.createObjectURL(blob)
                              const a = document.createElement('a')
                              a.href = url
                              a.download = `spivanka-data-${session?.user?.email}-${new Date().toISOString().split('T')[0]}.json`
                              document.body.appendChild(a)
                              a.click()
                              window.URL.revokeObjectURL(url)
                              document.body.removeChild(a)
                              safeToast.success('Дані успішно експортовано!')
                            } else {
                              safeToast.error('Помилка експорту даних')
                            }
                          } catch (error) {
                            console.error('Ошибка экспорта:', error)
                            safeToast.error('Помилка експорту даних')
                          }
                        }}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm w-full sm:w-auto"
                      >
                        📥 Експортувати
                      </button>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-3 sm:p-4 border border-orange-200">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-800 text-sm sm:text-base">Google OAuth</h4>
                        <p className="text-xs sm:text-sm text-gray-600">Ви використовуєте Google для входу. Пароль не потрібен.</p>
                      </div>
                      <button 
                        onClick={() => {
                          safeToast.success('Для зміни облікових даних використовуйте Google аккаунт')
                        }}
                        className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm w-full sm:w-auto"
                        disabled
                      >
                        🔒 Недоступно
                      </button>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-3 sm:p-4 border border-red-200">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-red-800 text-sm sm:text-base">Видалити акаунт</h4>
                        <p className="text-xs sm:text-sm text-red-600">Ця дія незворотна. Всі ваші дані будуть видалені назавжди.</p>
                      </div>
                      <button 
                        onClick={async () => {
                          if (confirm('Ви впевнені, що хочете видалити свій акаунт? Ця дія незворотна і всі ваші дані будуть видалені назавжди.')) {
                            if (confirm('Останнє попередження: всі ваші привітання, платежі та налаштування календаря будуть видалені. Продовжити?')) {
                              try {
                                const response = await fetch('/api/user/delete', { method: 'DELETE' })
                                if (response.ok) {
                                  safeToast.success('Акаунт успішно видалено')
                                  
                                  // Выходим из сессии NextAuth
                                  await signOut({ 
                                    callbackUrl: '/',
                                    redirect: false 
                                  })
                                  
                                  // Перенаправляем на главную страницу
                                  setTimeout(() => {
                                    window.location.href = '/'
                                  }, 1000)
                                } else {
                                  const errorData = await response.json()
                                  console.error('Ошибка удаления аккаунта:', errorData)
                                  safeToast.error('Помилка видалення акаунта')
                                }
                              } catch (error) {
                                console.error('Ошибка удаления аккаунта:', error)
                                safeToast.error('Помилка видалення акаунта')
                              }
                            }
                          }
                        }}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm w-full sm:w-auto"
                      >
                        🗑️ Видалити
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Information */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-4 sm:p-6 border border-purple-100">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Star size={20} className="sm:w-6 sm:h-6 text-purple-600" />
                  Інформація про сервіс
                </h3>
                <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm text-gray-600">
                  <p>• Ваші персональні дані шифруються перед збереженням</p>
                  <p>• Привітання автоматично видаляються через 30 днів</p>
                  <p>• Ви можете експортувати свої дані в будь-який час</p>
                  <p>• Для підтримки звертайтесь: support@spivanka.com</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}