'use client'

import React, { useState, useEffect } from 'react'
import { CalendarEvent } from '@/types'
import { Calendar, Gift, Heart, Star, Plus, Cake, PartyPopper } from 'lucide-react'
import { motion } from 'framer-motion'
import { safeToast } from '@/lib/toast'

interface CalendarEventsSectionProps {
  onCreateGreeting: (eventData: { recipientName: string; occasion: string; relationship?: string; isCustomOccasion?: boolean }) => void
}

export const CalendarEventsSection: React.FC<CalendarEventsSectionProps> = ({
  onCreateGreeting
}) => {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [needsReauth, setNeedsReauth] = useState(false)
  const [needsCalendarAuth, setNeedsCalendarAuth] = useState(false)
  const [calendarConnected, setCalendarConnected] = useState(false)

  const handleConnectCalendar = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // Перенаправляем на авторизацию календаря
      window.location.href = '/api/auth/calendar'
    } catch (error) {
      console.error('Помилка підключення календаря:', error)
      setError('Помилка підключення календаря')
      setIsLoading(false)
    }
  }

  const handleReauthWithCalendar = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // Используем отдельную авторизацию календаря
      window.location.href = '/api/auth/calendar'
    } catch (error) {
      console.error('Помилка переавторизації з календарем:', error)
      setError('Помилка переавторизації з календарем')
      setIsLoading(false)
    }
  }

  const checkCalendarStatus = async () => {
    try {
      const response = await fetch('/api/auth/calendar/status')
      const data = await response.json()
      
      if (response.ok) {
        setCalendarConnected(data.connected)
        setNeedsCalendarAuth(!data.connected)
      }
    } catch (error) {
      console.error('Помилка перевірки статусу календаря:', error)
    }
  }

  const handleSync = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch('/api/calendar/cache', { method: 'POST' })
      const data = await response.json()
      
      if (!response.ok) {
        if (data.needsReauth) {
          // Сначала пытаемся обновить токены
          console.log('🔄 Пытаюсь обновить токены календаря...')
          const refreshResponse = await fetch('/api/calendar/refresh-tokens', { method: 'POST' })
          const refreshData = await refreshResponse.json()
          
          if (refreshResponse.ok) {
            console.log('✅ Токены обновлены, повторяю синхронизацию...')
            // Повторяем синхронизацию с обновленными токенами
            const retryResponse = await fetch('/api/calendar/cache', { method: 'POST' })
            const retryData = await retryResponse.json()
            
            if (retryResponse.ok) {
              safeToast.success(`Синхронізовано ${retryData.eventsCount} подій`)
              await loadCalendarEvents()
              return
            } else {
              setNeedsReauth(true)
              setError('Токени календаря застаріли. Необхідно переавторизуватися.')
            }
          } else {
            setNeedsReauth(true)
            setError('Токени календаря застаріли. Необхідно переавторизуватися.')
          }
        } else {
          setError(data.error || 'Помилка синхронізації')
        }
        return
      }
      
      safeToast.success(`Синхронізовано ${data.eventsCount} подій`)
      // Перезагружаем события после синхронизации
      await loadCalendarEvents()
    } catch (error) {
      console.error('Помилка синхронізації:', error)
      setError('Помилка синхронізації календаря')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClearCache = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // Сначала очищаем кэш
      const clearResponse = await fetch('/api/calendar/cache/clear', { method: 'POST' })
      const clearData = await clearResponse.json()
      
      if (!clearResponse.ok) {
        setError(clearData.error || 'Помилка очищення кешу')
        return
      }
      
      // Затем синхронизируем заново
      const syncResponse = await fetch('/api/calendar/cache', { method: 'POST' })
      const syncData = await syncResponse.json()
      
      if (!syncResponse.ok) {
        setError(syncData.error || 'Помилка синхронізації')
        return
      }
      
      safeToast.success(`Кеш очищено і синхронізовано ${syncData.eventsCount} подій`)
      // Перезагружаем события после синхронизации
      await loadCalendarEvents()
    } catch (error) {
      console.error('Помилка очищення кешу:', error)
      setError('Помилка очищення кешу календаря')
    } finally {
      setIsLoading(false)
    }
  }

  const loadCalendarEvents = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch('/api/calendar/events')
      const data = await response.json()
      
      if (!response.ok) {
        if (data.needsCalendarAuth) {
          setNeedsCalendarAuth(true)
          setError('Календарь не підключено. Необхідно підключити Google Calendar.')
          setEvents([])
          return
        }
        
        if (data.needsSync) {
          setError('Календарні події не синхронізовані. Необхідна синхронізація.')
          setEvents([])
          setNeedsReauth(false)
          setNeedsCalendarAuth(false)
          return
        }
        
        if (data.needsReauth) {
          // Сначала пытаемся обновить токены
          console.log('🔄 Пытаюсь обновить токены календаря...')
          const refreshResponse = await fetch('/api/calendar/refresh-tokens', { method: 'POST' })
          const refreshData = await refreshResponse.json()
          
          if (refreshResponse.ok) {
            console.log('✅ Токены обновлены, повторяю загрузку событий...')
            // Повторяем загрузку с обновленными токенами
            const retryResponse = await fetch('/api/calendar/events')
            const retryData = await retryResponse.json()
            
            if (retryResponse.ok) {
              const allEvents = [...(retryData.events.birthdays || []), ...(retryData.events.holidays || [])]
              setEvents(allEvents)
              setNeedsReauth(false)
              setNeedsCalendarAuth(false)
              return
            } else {
              setNeedsReauth(true)
              setError('Необхідно переавторизуватися для доступу до календаря')
            }
          } else {
            setNeedsReauth(true)
            setError('Необхідно переавторизуватися для доступу до календаря')
          }
        } else {
          // Проверяем, не связана ли ошибка с токенами
          const errorMessage = data.error || 'Помилка завантаження подій'
          if (errorMessage.includes('invalid authentication credentials') || 
              errorMessage.includes('insufficient authentication scopes')) {
            setNeedsCalendarAuth(true)
            setError('Токени календаря застаріли. Необхідно переавторизуватися.')
          } else {
            setError(errorMessage)
          }
        }
        
        // Показываем тестовые данные при ошибке
        if (data.events && data.isDemo) {
          const allEvents = [...data.events.birthdays, ...data.events.holidays]
          setEvents(allEvents)
        }
        return
      }
      
      // Объединяем события из разных категорий
      const allEvents = [...(data.events.birthdays || []), ...(data.events.holidays || [])]
      setEvents(allEvents)
      
      // Показываем предупреждение если кэш устарел
      if (data.expired) {
        setError('Дані календаря застарілі. Рекомендується синхронізація.')
      }
      setNeedsReauth(false)
      setNeedsCalendarAuth(false)
    } catch (error) {
      console.error('Помилка завантаження календарних подій:', error)
      setError('Помилка підключення до календаря')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    checkCalendarStatus()
    loadCalendarEvents()
    
    // Проверяем URL параметры для обработки результата подключения календаря
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('calendar_connected') === 'true') {
      safeToast.success('Календарь успішно підключено!')
      setCalendarConnected(true)
      setNeedsCalendarAuth(false)
      // Очищаем URL параметры
      window.history.replaceState({}, '', window.location.pathname)
      // Автоматически начинаем синхронизацию
      setTimeout(() => {
        handleSync()
      }, 1000)
    } else if (urlParams.get('calendar_error')) {
      const errorType = urlParams.get('calendar_error')
      safeToast.error(`Помилка підключення календаря: ${errorType}`)
      // Очищаем URL параметры
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  const handleCreateGreeting = (event: CalendarEvent) => {
    let recipientName = ''
    let occasion = ''
    let relationship = ''
    
    // Определяем повод на основе типа события
    if (event.type === 'birthday') {
      occasion = 'День народження'
      
      // Для дней рождения заполняем имя получателя
      recipientName = event.recipient || (event as any).relationship || ''
      relationship = (event as any).relationship || ''
      
      console.log('📝 Створення привітання для дня народження:', { recipientName, relationship })
    } else if (event.type === 'holiday') {
      // Для праздников используем заголовок как повод, имя НЕ заполняется
      occasion = event.title
      recipientName = ''
      relationship = ''
    } else {
      // Для кастомных событий используем заголовок, имя НЕ заполняется
      occasion = event.title
      recipientName = ''
      relationship = ''
    }
    
    console.log('📝 Передача даних у форму:', { recipientName, occasion, relationship, isCustomOccasion: event.type === 'holiday' || event.type === 'custom' })
    
    onCreateGreeting({
      recipientName,
      occasion,
      relationship,
      isCustomOccasion: event.type === 'holiday' || event.type === 'custom'
    })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const currentYear = now.getFullYear()
    
    // Нормализуем дату события (переносим прошлые события на следующий год)
    const normalizedDate = new Date(date)
    if (normalizedDate.getFullYear() < currentYear) {
      normalizedDate.setFullYear(currentYear + 1)
    }
    
    const diffTime = normalizedDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    const formattedDate = normalizedDate.toLocaleDateString('uk-UA', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
    
    if (diffDays === 0) {
      return `${formattedDate} (сьогодні)`
    } else if (diffDays === 1) {
      return `${formattedDate} (завтра)`
    } else if (diffDays <= 7) {
      return `${formattedDate} (через ${diffDays} дн.)`
    } else {
      return formattedDate
    }
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'birthday':
        return <Cake className="w-5 h-5 text-pink-500" />
      case 'holiday':
        return <PartyPopper className="w-5 h-5 text-purple-500" />
      default:
        return <Calendar className="w-5 h-5 text-blue-500" />
    }
  }

  const getEventColor = (type: string) => {
    switch (type) {
      case 'birthday':
        return 'from-pink-50 to-rose-50 border-pink-200'
      case 'holiday':
        return 'from-purple-50 to-indigo-50 border-purple-200'
      default:
        return 'from-blue-50 to-cyan-50 border-blue-200'
    }
  }

  // Разделяем события на дни рождения и праздники и сортируем по дате
  const now = new Date()
  const currentYear = now.getFullYear()
  
  // Функция для нормализации даты события (учитываем год)
  const normalizeEventDate = (dateString: string) => {
    const eventDate = new Date(dateString)
    const eventYear = eventDate.getFullYear()
    
    // Если событие в прошлом году, переносим на следующий год
    if (eventYear < currentYear) {
      eventDate.setFullYear(currentYear + 1)
    }
    
    return eventDate
  }
  
  // Сортируем события по дате с учетом года
  const birthdays = events
    .filter(event => event.type === 'birthday')
    .sort((a, b) => {
      const dateA = normalizeEventDate(a.date)
      const dateB = normalizeEventDate(b.date)
      return dateA.getTime() - dateB.getTime()
    })
  
  const holidays = events
    .filter(event => event.type === 'holiday' || event.type === 'custom')
    .sort((a, b) => {
      const dateA = normalizeEventDate(a.date)
      const dateB = normalizeEventDate(b.date)
      return dateA.getTime() - dateB.getTime()
    })

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <Calendar className="w-6 h-6 text-gray-600" />
          <h3 className="text-xl font-semibold text-gray-800">Календарні події</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-300"></div>
          <span className="ml-3 text-gray-600">Завантаження подій...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <Calendar className="w-6 h-6 text-gray-600" />
          <h3 className="text-xl font-semibold text-gray-800">Календарні події</h3>
        </div>
        <div className="text-center py-8">
          <div className="text-red-500 mb-4">{error}</div>
          <div className="flex gap-3 justify-center">
            {needsCalendarAuth ? (
              <button
                onClick={handleConnectCalendar}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
              >
                Підключити календар
              </button>
            ) : error.includes('insufficient authentication scopes') || error.includes('Календарь не подключен') || error.includes('invalid authentication credentials') ? (
              <button
                onClick={handleConnectCalendar}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
              >
                Підключити календар
              </button>
            ) : needsReauth ? (
              <div className="flex gap-2 justify-center">
                <button
                  onClick={handleReauthWithCalendar}
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Переавторизуватися
                </button>
                <button
                  onClick={async () => {
                    try {
                      setIsLoading(true)
                      const response = await fetch('/api/calendar/refresh-tokens', { method: 'POST' })
                      const data = await response.json()
                      
                      if (response.ok) {
                        safeToast.success('Токени календаря оновлено!')
                        await loadCalendarEvents()
                      } else {
                        safeToast.error(data.error || 'Помилка оновлення токенів')
                      }
                    } catch (error) {
                      console.error('Помилка оновлення токенів:', error)
                      safeToast.error('Помилка оновлення токенів')
                    } finally {
                      setIsLoading(false)
                    }
                  }}
                  disabled={isLoading}
                  className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'Оновлення...' : 'Спробувати оновити'}
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={loadCalendarEvents}
                  className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Оновити
                </button>
                {error.includes('синхронізація') && (
                  <button
                    onClick={handleSync}
                    className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
                  >
                    Синхронізувати
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <Calendar className="w-6 h-6 text-gray-600" />
          <h3 className="text-xl font-semibold text-gray-800">Календарні події</h3>
        </div>
        <div className="text-center py-8">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Календарні події не завантажені</p>
          <p className="text-sm text-gray-400 mt-2">
            {!calendarConnected ? 
              'Спочатку підключіть Google Calendar' : 
              'Натисніть "Синхронізувати" для завантаження подій з Google Calendar'
            }
          </p>
          <div className="mt-4">
            {!calendarConnected ? (
              <button
                onClick={handleConnectCalendar}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
              >
                Підключити календар
              </button>
            ) : (
              <div className="flex gap-2 justify-center">
                <button
                  onClick={handleSync}
                  className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
                >
                  Синхронізувати календар
                </button>
                <button
                  onClick={handleConnectCalendar}
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                  title="Підключити Google Calendar"
                >
                  Підключити календар
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <Calendar className="w-6 h-6 text-gray-600" />
        <h3 className="text-xl font-semibold text-gray-800">Календарні події</h3>
        <span className="text-sm text-gray-500">({events.length})</span>
        {calendarConnected && (
          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
            Підключено
          </span>
        )}
        <div className="ml-auto">
          {/* Десктопная версия кнопок */}
          <div className="hidden sm:flex gap-2">
            <button
              onClick={handleSync}
              disabled={isLoading}
              className="bg-green-500 text-white px-3 py-1 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 text-sm"
            >
              {isLoading ? 'Синхронізація...' : 'Синхронізувати'}
            </button>
            <button
              onClick={handleClearCache}
              disabled={isLoading}
              className="bg-orange-500 text-white px-3 py-1 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 text-sm"
              title="Очистити кеш і повторно синхронізувати"
            >
              {isLoading ? 'Очищення...' : 'Пересинхронізувати'}
            </button>
            <button
              onClick={async () => {
                try {
                  setIsLoading(true)
                  const response = await fetch('/api/calendar/refresh-tokens', { method: 'POST' })
                  const data = await response.json()
                  
                  if (response.ok) {
                    safeToast.success('Токени календаря оновлено!')
                    await loadCalendarEvents()
                  } else {
                    safeToast.error(data.error || 'Помилка оновлення токенів')
                  }
                } catch (error) {
                  console.error('Помилка оновлення токенів:', error)
                  safeToast.error('Помилка оновлення токенів')
                } finally {
                  setIsLoading(false)
                }
              }}
              disabled={isLoading}
              className="bg-blue-500 text-white px-3 py-1 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 text-sm"
              title="Оновити токени календаря"
            >
              {isLoading ? 'Оновлення...' : 'Оновити токени'}
            </button>
          </div>
        </div>
      </div>

      {/* Мобильная версия кнопок календаря */}
      <div className="block sm:hidden mb-4">
        <div className="flex gap-2">
          <button
            onClick={handleSync}
            disabled={isLoading}
            className="flex-1 bg-green-500 text-white py-2 px-3 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 text-sm font-medium"
          >
            {isLoading ? 'Синхронізація...' : '🔄 Синхронізувати'}
          </button>
          <button
            onClick={handleClearCache}
            disabled={isLoading}
            className="flex-1 bg-orange-500 text-white py-2 px-3 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 text-sm font-medium"
            title="Очистити кеш і повторно синхронізувати"
          >
            {isLoading ? 'Очищення...' : '🔄 Пересинхронізувати'}
          </button>
          <button
            onClick={async () => {
              try {
                setIsLoading(true)
                const response = await fetch('/api/calendar/refresh-tokens', { method: 'POST' })
                const data = await response.json()
                
                if (response.ok) {
                  safeToast.success('Токени календаря оновлено!')
                  await loadCalendarEvents()
                } else {
                  safeToast.error(data.error || 'Помилка оновлення токенів')
                }
              } catch (error) {
                console.error('Помилка оновлення токенів:', error)
                safeToast.error('Помилка оновлення токенів')
              } finally {
                setIsLoading(false)
              }
            }}
            disabled={isLoading}
            className="flex-1 bg-blue-500 text-white py-2 px-3 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 text-sm font-medium"
            title="Оновити токени календаря"
          >
            {isLoading ? 'Оновлення...' : '🔑 Оновити токени'}
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Дни рождения */}
        {birthdays.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Cake className="w-5 h-5 text-pink-500" />
              <h4 className="text-lg font-semibold text-gray-700">Дні народження</h4>
              <span className="text-sm text-gray-500">({birthdays.length})</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {birthdays.map((event) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`bg-gradient-to-r ${getEventColor(event.type)} border rounded-xl p-3 hover:shadow-md transition-all max-w-sm`}
                >
                  <div className="flex items-center gap-3">
                    {getEventIcon(event.type)}
                    <div className="flex-1 min-w-0">
                      <h5 className="font-semibold text-gray-800 truncate">
                        {event.recipient || (event as any).relationship || 'Невідомо'}
                      </h5>
                      {(event as any).relationship && (
                        <p className="text-xs text-purple-600 truncate">
                          Ваші стосунки: {(event as any).relationship}
                        </p>
                      )}
                      <p className="text-sm text-gray-600">
                        {formatDate(event.date)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleCreateGreeting(event)}
                      className="flex-shrink-0 bg-pink-500 text-white px-2 py-1 rounded-md hover:bg-pink-600 transition-colors text-xs"
                      title="Створити привітання"
                    >
                      Створити
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Праздники */}
        {holidays.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <PartyPopper className="w-5 h-5 text-purple-500" />
              <h4 className="text-lg font-semibold text-gray-700">Свята та події</h4>
              <span className="text-sm text-gray-500">({holidays.length})</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {holidays.map((event) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`bg-gradient-to-r ${getEventColor(event.type)} border rounded-xl p-3 hover:shadow-md transition-all max-w-sm`}
                >
                  <div className="flex items-center gap-3">
                    {getEventIcon(event.type)}
                    <div className="flex-1 min-w-0">
                      <h5 className="font-semibold text-gray-800 truncate">
                        {event.title}
                      </h5>
                      <p className="text-sm text-gray-600">
                        {formatDate(event.date)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleCreateGreeting(event)}
                      className="flex-shrink-0 bg-purple-500 text-white px-2 py-1 rounded-md hover:bg-purple-600 transition-colors text-xs"
                      title="Створити привітання"
                    >
                      Створити
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 