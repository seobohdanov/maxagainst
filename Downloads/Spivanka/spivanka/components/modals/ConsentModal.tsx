'use client'

import React, { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { X, Mail, Shield, CheckCircle, Calendar } from 'lucide-react'

interface ConsentModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function ConsentModal({ isOpen, onClose }: ConsentModalProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [consentData, setConsentData] = useState({
    termsConsent: false,
    marketingConsent: false,
    calendarContactsConsent: false
  })

  const handleConsentSubmit = async () => {
    if (!consentData.termsConsent) {
      alert('Необхідно погодитися з умовами використання та політикою конфіденційності')
      return
    }

    setIsLoading(true)

    try {
      // Сохраняем согласия
      const consentResponse = await fetch('/api/consent/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: session?.user?.email,
          termsConsent: consentData.termsConsent,
          marketingConsent: consentData.marketingConsent,
          calendarContactsConsent: consentData.calendarContactsConsent
        })
      })

      if (consentResponse.ok) {
        console.log('✅ Згоди збережено успішно')
        
        // Проверяем, дано ли согласие на доступ к календарю и контактам
        if (consentData.calendarContactsConsent) {
          // Если дано согласие, перенаправляем на запрос дополнительных разрешений
          console.log('🔐 Перенаправлення на запит додаткових дозволів для календаря та контактів')
          window.location.href = '/api/auth/calendar-alt'
        } else {
          // Если согласия нет, просто закрываем модальное окно
          onClose()
        }
      } else {
        throw new Error('Помилка збереження згод')
      }
    } catch (error) {
      console.error('Помилка:', error)
      alert('Помилка збереження згод')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    console.log('🔐 Виклик handleClose, termsConsent:', consentData.termsConsent)
    
    // Если пользователь закрывает окно без согласий, перенаправляем на главную
    if (!consentData.termsConsent) {
      console.log('🔀 Перенаправлення на головну сторінку через закриття модального вікна згод')
      console.log('🔀 Поточний URL:', window.location.href)
      
      // Переходим на главную страницу
      console.log('🔀 Перехід на головну сторінку')
      router.push('/')
      return
    }
    
    // Если есть обязательное согласие, закрываем окно
    console.log('✅ Закриття модального вікна згод (згоди надано)')
    onClose()
  }

  // Обработчик клавиши Escape
  React.useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        console.log('🔐 Натиснуто Escape')
        handleClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, consentData.termsConsent])

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleClose}
    >
      <div 
        className="bg-white rounded-2xl max-w-md w-full p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={(e) => {
            console.log('🔘 Натиснуто кнопку X')
            e.stopPropagation()
            handleClose()
          }}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="text-center mb-6">
          <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-purple-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Підтвердження згод
          </h2>
          <p className="text-gray-600">
            Підтвердіть згоди для продовження роботи
          </p>
        </div>

        <div className="space-y-4 mb-6">
          {/* Обязательное согласие с условиями */}
          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={consentData.termsConsent}
              onChange={(e) => setConsentData(prev => ({ ...prev, termsConsent: e.target.checked }))}
              className="mt-1 w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
              required
            />
            <div className="text-sm text-gray-700">
              <span className="font-medium">Я погоджуюся з </span>
              <a href="/terms" target="_blank" className="text-purple-600 hover:text-purple-700 underline">
                умовами використання
              </a>
              <span className="font-medium"> та </span>
              <a href="/privacy" target="_blank" className="text-purple-600 hover:text-purple-700 underline">
                політикою конфіденційності
              </a>
              <span className="text-red-500"> *</span>
            </div>
          </label>

          {/* Необязательное согласие на маркетинг */}
          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={consentData.marketingConsent}
              onChange={(e) => setConsentData(prev => ({ ...prev, marketingConsent: e.target.checked }))}
              className="mt-1 w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
            />
            <div className="text-sm text-gray-700">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-500" />
                <span>Я хочу отримувати маркетингові матеріали та новини від Spivanka</span>
              </div>
              <p className="text-xs text-gray-500 mt-1 ml-6">
                Ви можете відписатися в будь-який час
              </p>
            </div>
          </label>

          {/* Необязательное согласие на доступ к календарю и контактам */}
          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={consentData.calendarContactsConsent}
              onChange={(e) => setConsentData(prev => ({ ...prev, calendarContactsConsent: e.target.checked }))}
              className="mt-1 w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
            />
            <div className="text-sm text-gray-700">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span>Дозволити доступ до календаря та контактів для персоналізованих привітань</span>
              </div>
              <p className="text-xs text-gray-500 mt-1 ml-6">
                Ми використовуємо ці дані для створення індивідуальних привітань на основі подій з вашого календаря
              </p>
            </div>
          </label>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleConsentSubmit}
            disabled={isLoading || !consentData.termsConsent}
            className="w-full flex items-center justify-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Збереження...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5 mr-2" />
                Підтвердити згоди
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
} 