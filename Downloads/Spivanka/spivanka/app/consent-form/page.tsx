'use client'

import React, { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Mail, Shield, CheckCircle, ArrowLeft } from 'lucide-react'

export default function ConsentFormPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [consentData, setConsentData] = useState({
    termsConsent: false,
    marketingConsent: false
  })

  // Проверяем, авторизован ли пользователь
  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      // Если не авторизован, перенаправляем на главную
      router.push('/')
      return
    }

    // Проверяем, есть ли уже согласия
    checkExistingConsents()
  }, [session, status, router])

  const checkExistingConsents = async () => {
    try {
      const response = await fetch('/api/consent/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: session?.user?.email })
      })

      const data = await response.json()
      
      if (data.success && data.hasConsents) {
        // Если согласия уже есть, перенаправляем на dashboard
        router.push('/dashboard')
      }
    } catch (error) {
      console.error('Помилка перевірки згод:', error)
    }
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
          marketingConsent: consentData.marketingConsent
        })
      })

      if (consentResponse.ok) {
        // Перенаправляем на dashboard
        router.push('/dashboard')
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

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' })
  }

  // Показываем загрузку пока проверяем сессию
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  // Если не авторизован, показываем загрузку (будет перенаправление)
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-lg">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-purple-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Підтвердження згод
          </h1>
          <p className="text-gray-600">
            Для продовження роботи необхідно підтвердити згоди
          </p>
        </div>

        <div className="space-y-6 mb-8">
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
            onClick={handleSignOut}
            className="w-full px-6 py-3 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Вийти з аккаунту
          </button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Натискаючи кнопку, ви погоджуєтесь з нашими умовами використання
          </p>
        </div>
      </div>
    </div>
  )
} 