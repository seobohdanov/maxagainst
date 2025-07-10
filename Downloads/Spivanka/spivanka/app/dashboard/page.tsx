'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { DashboardPage } from '@/components/pages/DashboardPage'
import { Greeting, CalendarEvent } from '@/types'
import { safeToast } from '@/lib/toast'

export default function DashboardPageWrapper() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [userGreetings, setUserGreetings] = useState<Greeting[]>([])
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([])

  // Загружаем данные пользователя
  useEffect(() => {
    if (session) {
      loadUserData()
    }
  }, [session])

  const loadUserData = async () => {
    try {
      console.log('🔄 Загрузка данных пользователя...')
      
      // Загружаем приветствия с принудительным обновлением кеша
      const greetingsResponse = await fetch('/api/greetings', {
        cache: 'no-store', // Отключаем кеширование для актуальных данных
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })
      if (greetingsResponse.ok) {
        const data = await greetingsResponse.json()
        console.log('📊 Получено поздравлений:', data.greetings?.length || 0)
        setUserGreetings(data.greetings || [])
      } else {
        console.error('❌ Ошибка загрузки поздравлений:', greetingsResponse.status)
      }

      // Загружаем события календаря (пока пустой массив)
      setCalendarEvents([])
    } catch (error) {
      console.error('❌ Ошибка загрузки данных пользователя:', error)
    }
  }

  // Обработка успешного подключения календаря
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const calendarConnected = urlParams.get('calendar_connected')
    
    if (calendarConnected === 'true') {
      console.log('✅ Календарь успешно подключен')
      safeToast.success('Календар успішно підключено!')
      
      // Очищаем параметр из URL без перезагрузки страницы
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete('calendar_connected')
      window.history.replaceState({}, '', newUrl.toString())
    }
  }, [])

  const handleBack = () => {
    router.push('/')
  }

  const handleCreateClick = () => {
    // Добавляем параметр для принудительного перехода к созданию
    router.push('/?create=true')
  }

  const handleCreateFromCalendar = (eventData: { recipientName: string; occasion: string; relationship?: string; isCustomOccasion?: boolean }) => {
    // Сохраняем данные события в localStorage для передачи в форму
    localStorage.setItem('calendarEventData', JSON.stringify(eventData))
    router.push('/create')
  }

  // Добавляем обработку навигации через браузер и фокуса окна
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Очищаем состояние при уходе со страницы
      console.log('🧹 Очистка состояния при уходе с дашборда')
    }

    const handleFocus = () => {
      // Обновляем данные при возвращении на вкладку
      console.log('🔄 Возвращение на вкладку - обновляем данные')
      loadUserData()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('focus', handleFocus)
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Завантаження...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    router.push('/')
    return null
  }

  return (
    <DashboardPage
      session={session}
      userGreetings={userGreetings}
      calendarEvents={calendarEvents}
      onBack={handleBack}
      onCreateClick={handleCreateClick}
      onCreateFromCalendar={handleCreateFromCalendar}
      onGreetingDeleted={async (greetingId) => {
        // Видаляємо з локального стану після видалення
        setUserGreetings(prev => prev.filter(g => g.id !== greetingId))
        
        // Также обновляем данные с сервера для синхронизации
        try {
          console.log('🔄 Обновление данных после удаления поздравления...')
          // Небольшая задержка для обеспечения консистентности базы данных
          await new Promise(resolve => setTimeout(resolve, 500))
          await loadUserData()
        } catch (error) {
          console.error('❌ Ошибка обновления данных после удаления:', error)
        }
      }}
    />
  )
} 