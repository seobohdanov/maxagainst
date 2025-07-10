'use client'

import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle, XCircle, Mail, Shield } from 'lucide-react'

export default function UnsubscribePage() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'invalid'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('invalid')
      setMessage('Неправильне посилання для відписки')
      return
    }

    unsubscribeUser(token)
  }, [token])

  const unsubscribeUser = async (token: string) => {
    try {
      const response = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token })
      })

      const data = await response.json()

      if (data.success) {
        setStatus('success')
        setMessage('Ви успішно відписалися від маркетингової розсилки')
      } else {
        setStatus('error')
        setMessage(data.error || 'Помилка відписки')
      }
    } catch (error) {
      setStatus('error')
      setMessage('Помилка відписки від розсилки')
    }
  }

  const resubscribe = async () => {
    try {
      const response = await fetch('/api/resubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token })
      })

      const data = await response.json()

      if (data.success) {
        setStatus('success')
        setMessage('Ви знову підписалися на розсилку')
      } else {
        setStatus('error')
        setMessage(data.error || 'Помилка підписки')
      }
    } catch (error) {
      setStatus('error')
      setMessage('Помилка підписки на розсилку')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-600 to-indigo-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
        <div className="text-center">
          {status === 'loading' && (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">
                Обробка запиту...
              </h1>
              <p className="text-gray-600">
                Відписуємо вас від розсилки
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-800 mb-2">
                Успішно відписано!
              </h1>
              <p className="text-gray-600 mb-6">
                {message}
              </p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-green-500 mt-0.5" />
                  <div className="text-sm text-green-700">
                    <p className="font-medium mb-1">Ваші дані захищені</p>
                    <p>Ми більше не будемо надсилати вам маркетингові матеріали. Ваші персональні дані залишаються в безпеці.</p>
                  </div>
                </div>
              </div>
              <button
                onClick={resubscribe}
                className="bg-pink-600 text-white px-6 py-2 rounded-lg hover:bg-pink-700 transition-colors"
              >
                Підписатися знову
              </button>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-800 mb-2">
                Помилка
              </h1>
              <p className="text-gray-600 mb-6">
                {message}
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-red-500 mt-0.5" />
                  <div className="text-sm text-red-700">
                    <p className="font-medium mb-1">Зверніться до підтримки</p>
                    <p>Якщо у вас виникли проблеми, напишіть нам на support@spivanka.com</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {status === 'invalid' && (
            <>
              <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-800 mb-2">
                Неправильне посилання
              </h1>
              <p className="text-gray-600 mb-6">
                {message}
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-yellow-500 mt-0.5" />
                  <div className="text-sm text-yellow-700">
                    <p className="font-medium mb-1">Перевірте посилання</p>
                    <p>Переконайтеся, що ви використовуєте правильне посилання з email.</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="text-center">
            <a 
              href="/"
              className="text-pink-600 hover:text-pink-700 font-medium"
            >
              Повернутися на головну
            </a>
          </div>
        </div>
      </div>
    </div>
  )
} 