'use client'

import React, { useState, useEffect } from 'react'
import { signIn, signOut, useSession } from 'next-auth/react'
import { X, Mail, Shield, CheckCircle, ArrowLeft, Calendar } from 'lucide-react'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  showContinueWithoutAuth?: boolean
}

export default function AuthModal({ isOpen, onClose, showContinueWithoutAuth = false }: AuthModalProps) {
  const { data: session, status } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [hasCheckedConsents, setHasCheckedConsents] = useState(false)
  const [hasConsents, setHasConsents] = useState(false)
  const [showConsentForm, setShowConsentForm] = useState(false)
  const [consentData, setConsentData] = useState({
    termsConsent: false,
    marketingConsent: false,
    calendarContactsConsent: false
  })

  // Сбрасываем состояние при каждом открытии модального окна
  useEffect(() => {
    if (isOpen) {
      setHasCheckedConsents(false)
      setHasConsents(false)
      setShowConsentForm(false)
      setConsentData({ termsConsent: false, marketingConsent: false, calendarContactsConsent: false })
    }
  }, [isOpen])

  // Проверяем согласия только для уже авторизованных пользователей
  useEffect(() => {
    if (session?.user?.email && !hasCheckedConsents && !hasConsents && isOpen) {
      checkExistingConsents(session.user.email)
    }
  }, [session, hasCheckedConsents, hasConsents, isOpen])

  const checkExistingConsents = async (email: string) => {
    try {
      const response = await fetch('/api/consent/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email })
      })

      const data = await response.json()
      
      if (data.success) {
        if (data.hasConsents) {
          // Если согласия уже есть, проверяем согласие на доступ к календарю и контактам
          if (data.hasCalendarContactsConsent) {
            // Если есть согласие на календарь, закрываем модальное окно
            setHasConsents(true)
            onClose()
          } else {
            // Если согласия на календарь нет, показываем форму согласий
            setShowConsentForm(true)
            setHasConsents(false)
          }
        } else {
          // Если согласий нет, показываем форму согласий
          setShowConsentForm(true)
          setHasConsents(false)
        }
      }
      
      setHasCheckedConsents(true)
    } catch (error) {
      console.error('Помилка перевірки згод:', error)
      setHasCheckedConsents(true)
      // В случае ошибки показываем форму согласий
      setShowConsentForm(true)
      setHasConsents(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    try {
      // Проверяем, есть ли согласие на доступ к календарю и контактам
      if (consentData.calendarContactsConsent) {
        // Если дано согласие, перенаправляем на запрос дополнительных разрешений
        console.log('🔐 Запрос дополнительных разрешений для календаря и контактов')
        window.location.href = '/api/auth/calendar-alt'
      } else {
        // Если согласия нет, обычная авторизация Google
        console.log('🔐 Обычная авторизация Google')
        await signIn('google', { callbackUrl: '/create' })
      }
    } catch (error) {
      console.error('Помилка авторизації:', error)
      alert('Помилка авторизації')
    } finally {
      setIsLoading(false)
    }
  }

  const handleContinueWithoutAuth = () => {
    console.log('🚀 Продовження без авторизації')
    onClose()
    // Переходим на страницу создания
    window.location.href = '/create'
  }

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
        setHasConsents(true)
        onClose()
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

  const handleBackToSignIn = () => {
    setShowConsentForm(false)
    setConsentData({ termsConsent: false, marketingConsent: false, calendarContactsConsent: false })
  }

  if (!isOpen) return null

  // Если показываем форму согласий
  if (showConsentForm && session) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-md w-full p-6 relative">
          <button
            onClick={onClose}
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

            <button
              onClick={() => signOut()}
              className="w-full px-6 py-3 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Вийти з аккаунту
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Основной экран авторизации
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="text-center mb-6">
          <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-purple-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Авторизація
          </h2>
          <p className="text-gray-600">
            Увійдіть для створення привітання або продовжіть без авторизації
          </p>
        </div>

        <div className="space-y-4">
          {/* Google Sign In Button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center px-6 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600 mr-2"></div>
                Завантаження...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Увійти через Google
              </>
            )}
          </button>

          {/* Continue without auth button */}
          {showContinueWithoutAuth && (
            <button
              onClick={handleContinueWithoutAuth}
              className="w-full px-6 py-3 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Продовжити без авторизації
            </button>
          )}

          {/* Sign out button for already authenticated users */}
          {session && (
            <button
              onClick={() => signOut()}
              className="w-full px-6 py-3 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Вийти з аккаунту
            </button>
          )}
        </div>
      </div>
    </div>
  )
} 