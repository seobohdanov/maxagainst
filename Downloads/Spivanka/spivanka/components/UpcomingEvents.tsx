'use client'

import React, { useState, useEffect } from 'react'
import { Calendar, PartyPopper, Cake, Plus } from 'lucide-react'

interface CalendarEvent {
  id: string
  title: string
  date: string
  type: 'birthday' | 'holiday' | 'custom'
  recipient?: string
  relationship?: string
  description?: string
  isCustom?: boolean
}

interface UpcomingEventsProps {
  userEmail: string
  onCreateFromEvent?: (eventData: { recipientName: string; occasion: string; relationship?: string; isCustomOccasion?: boolean }) => void
}

const getEventBg = (type: string) => {
  switch (type) {
    case 'birthday':
      return 'bg-gradient-to-r from-pink-50 to-rose-100';
    case 'holiday':
      return 'bg-gradient-to-r from-purple-50 to-indigo-100';
    default:
      return 'bg-gradient-to-r from-gray-50 to-gray-100';
  }
}

export const UpcomingEvents: React.FC<UpcomingEventsProps> = ({ userEmail, onCreateFromEvent }) => {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUpcomingEvents()
  }, [userEmail])

  const handleCreateGreeting = (event: CalendarEvent) => {
    if (!onCreateFromEvent) return

    // Определяем тип события для приветствия
    let occasion = 'День народження'
    let isCustomOccasion = false
    let recipientName = ''
    let relationship = ''

    if (event.type === 'holiday') {
      occasion = event.title
      isCustomOccasion = true
      // Для праздников имя НЕ заполняется
      recipientName = ''
      relationship = ''
    } else if (event.type === 'birthday') {
      occasion = 'День народження'
      isCustomOccasion = false
      // Для дней рождения: если есть родственная связь, имя не заполняем
      if (event.relationship) {
        // Родственная связь - имя не заполняем
        recipientName = ''
        relationship = event.relationship
      } else {
        // Обычный контакт - заполняем имя
        recipientName = event.recipient || event.title
        relationship = ''
      }
    }

    // Создаем данные для приветствия
    const eventData = {
      recipientName: recipientName,
      occasion: occasion,
      relationship: relationship,
      isCustomOccasion: isCustomOccasion
    }

    onCreateFromEvent(eventData)
  }

  const loadUpcomingEvents = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/calendar/events')
      
      if (response.ok) {
        const data = await response.json()
        console.log('📅 UpcomingEvents: получены данные:', data)
        
        if (data.success && data.events) {
          const allEvents = [
            ...(data.events.birthdays || []),
            ...(data.events.holidays || [])
          ]
          const now = new Date()
          const currentYear = now.getFullYear()
          const oneYearFromNow = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
          const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000)

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

          // Ближайший день рождения
          const nextBirthday = allEvents
            .filter(e => e.type === 'birthday')
            .map(e => ({ ...e, normalizedDate: normalizeEventDate(e.date) }))
            .filter(e => e.normalizedDate >= now && e.normalizedDate <= oneYearFromNow)
            .sort((a, b) => a.normalizedDate.getTime() - b.normalizedDate.getTime())[0]
          
          // Ближайший праздник
          const nextHoliday = allEvents
            .filter(e => e.type === 'holiday')
            .map(e => ({ ...e, normalizedDate: normalizeEventDate(e.date) }))
            .filter(e => e.normalizedDate >= now && e.normalizedDate <= sixtyDaysFromNow)
            .sort((a, b) => a.normalizedDate.getTime() - b.normalizedDate.getTime())[0]

          // Только уникальные события по id (если совпадают по дате/id)
          const uniqueEvents: CalendarEvent[] = []
          if (nextBirthday) uniqueEvents.push(nextBirthday)
          if (nextHoliday && (!nextBirthday || nextHoliday.id !== nextBirthday.id)) uniqueEvents.push(nextHoliday)

          setEvents(uniqueEvents)
        } else {
          console.log('📅 UpcomingEvents: данные не получены или не успешны')
        }
      } else {
        console.error('📅 UpcomingEvents: ошибка ответа:', response.status)
      }
    } catch (error) {
      console.error('Ошибка загрузки ближайших событий:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const currentYear = today.getFullYear()
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)
    
    // Нормализуем дату события (переносим прошлые события на следующий год)
    const normalizedDate = new Date(date)
    if (normalizedDate.getFullYear() < currentYear) {
      normalizedDate.setFullYear(currentYear + 1)
    }
    
    if (normalizedDate.toDateString() === today.toDateString()) {
      return 'Сьогодні'
    } else if (normalizedDate.toDateString() === tomorrow.toDateString()) {
      return 'Завтра'
    } else {
      return normalizedDate.toLocaleDateString('uk-UA', { 
        day: 'numeric', 
        month: 'long',
        year: 'numeric'
      })
    }
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'birthday':
        return <Cake className="w-4 h-4 text-pink-500" />
      case 'holiday':
        return <PartyPopper className="w-4 h-4 text-purple-500" />
      default:
        return <Calendar className="w-4 h-4 text-blue-500" />
    }
  }

  if (loading) {
    return (
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  if (events.length === 0) {
    return null
  }

  return (
    <div className="mt-4 max-w-full w-full">
      <h3 className="text-sm font-medium text-gray-700 mb-2">Ближчі події:</h3>
      <div className="flex flex-row gap-2 w-full overflow-x-auto pb-1">
        {events.map((event) => (
          <div
            key={event.id}
            className={`flex items-center gap-3 p-3 rounded-lg min-w-[300px] max-w-[90vw] ${getEventBg(event.type)}`}
          >
            {getEventIcon(event.type)}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-800 whitespace-normal break-words">
                {event.type === 'birthday'
                  ? (event.recipient || event.relationship || event.title)
                  : event.title}
              </div>
              {event.type === 'birthday' && event.relationship && (
                <div className="text-xs text-gray-500">
                  Ваші стосунки: {event.relationship}
                </div>
              )}
              <div className="text-xs text-gray-600">
                {formatDate(event.date)}
              </div>
            </div>
            {onCreateFromEvent && (
              <button
                onClick={() => handleCreateGreeting(event)}
                className="flex-shrink-0 px-2 py-1 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs rounded-md hover:from-pink-600 hover:to-purple-700 transition-all duration-200 shadow-sm whitespace-nowrap min-w-fit w-auto"
                title="Створити привітання"
              >
                Створити
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
} 