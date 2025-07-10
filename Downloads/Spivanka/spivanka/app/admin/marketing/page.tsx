'use client'

import React, { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Send, Mail, Users, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react'

interface MarketingStats {
  totalConsents: number
  activeConsents: number
  unsubscribed: number
  lastEmailSent: string | null
}

export default function MarketingPage() {
  const { data: session } = useSession()
  const [subject, setSubject] = useState('')
  const [htmlContent, setHtmlContent] = useState('')
  const [textContent, setTextContent] = useState('')
  const [testMode, setTestMode] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [stats, setStats] = useState<MarketingStats>({
    totalConsents: 0,
    activeConsents: 0,
    unsubscribed: 0,
    lastEmailSent: null
  })

  // Проверяем, является ли пользователь админом
  const isAdmin = session?.user?.email === 'seobohdanov@gmail.com'

  const loadStats = async () => {
    try {
      const response = await fetch('/api/admin/marketing/stats')
      const data = await response.json()
      if (data.success) {
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Помилка завантаження статистики:', error)
    }
  }

  React.useEffect(() => {
    if (isAdmin) {
      loadStats()
    }
  }, [isAdmin])

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-600 to-indigo-800 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-center text-gray-800 mb-4">
            Доступ заборонено
          </h1>
          <p className="text-gray-600 text-center">
            У вас немає прав для доступу до цієї сторінки.
          </p>
        </div>
      </div>
    )
  }

  const handleSendEmail = async () => {
    if (!subject || !htmlContent) {
      alert('Заповніть subject та HTML контент')
      return
    }

    setIsSending(true)
    setResult(null)

    try {
      const response = await fetch('/api/admin/send-marketing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject,
          htmlContent,
          textContent,
          testMode
        })
      })

      const data = await response.json()
      setResult(data)

      if (data.success) {
        // Очищаем форму после успешной отправки
        setSubject('')
        setHtmlContent('')
        setTextContent('')
      }

    } catch (error) {
      setResult({
        success: false,
        error: 'Помилка відправки розсилки'
      })
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-600 to-indigo-800 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex items-center gap-3 mb-8">
            <Send className="w-8 h-8 text-pink-600" />
            <h1 className="text-3xl font-bold text-gray-800">
              Маркетингова розсилка
            </h1>
          </div>

          {/* Статистика */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8" />
                <div>
                  <p className="text-sm opacity-90">Всього згод</p>
                  <p className="text-2xl font-bold">{stats.totalConsents}</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8" />
                <div>
                  <p className="text-sm opacity-90">Активні згоди</p>
                  <p className="text-2xl font-bold">{stats.activeConsents}</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-xl p-6 text-white">
              <div className="flex items-center gap-3">
                <XCircle className="w-8 h-8" />
                <div>
                  <p className="text-sm opacity-90">Відписалися</p>
                  <p className="text-2xl font-bold">{stats.unsubscribed}</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
              <div className="flex items-center gap-3">
                <Mail className="w-8 h-8" />
                <div>
                  <p className="text-sm opacity-90">Остання розсилка</p>
                  <p className="text-sm font-bold">
                    {stats.lastEmailSent ? new Date(stats.lastEmailSent).toLocaleDateString() : 'Немає'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Форма отправки */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Тема письма *
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                placeholder="Введіть тему письма..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                HTML контент *
              </label>
              <textarea
                value={htmlContent}
                onChange={(e) => setHtmlContent(e.target.value)}
                rows={12}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent font-mono text-sm"
                placeholder="<html><body><h1>Ваше письмо</h1><p>Текст письма...</p></body></html>"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Текстова версія (опціонально)
              </label>
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                placeholder="Текстова версія письма для клієнтів без підтримки HTML..."
              />
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={testMode}
                  onChange={(e) => setTestMode(e.target.checked)}
                  className="w-4 h-4 text-pink-600 border-gray-300 rounded focus:ring-pink-500"
                />
                <span className="text-sm text-gray-700">Тестовий режим (тільки на адміна)</span>
              </label>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleSendEmail}
                disabled={isSending || !subject || !htmlContent}
                className="flex items-center gap-2 bg-pink-600 text-white px-6 py-3 rounded-lg hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSending ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Відправка...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    {testMode ? 'Відправити тест' : 'Відправити розсилку'}
                  </>
                )}
              </button>

              <button
                onClick={loadStats}
                className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Оновити статистику
              </button>
            </div>
          </div>

          {/* Результат отправки */}
          {result && (
            <div className={`mt-6 p-4 rounded-lg border ${
              result.success 
                ? 'bg-green-50 border-green-200 text-green-800' 
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {result.success ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <XCircle className="w-5 h-5" />
                )}
                <span className="font-medium">
                  {result.success ? 'Успішно!' : 'Помилка'}
                </span>
              </div>
              <p>{result.message || result.error}</p>
              
              {result.result && (
                <div className="mt-4 text-sm">
                  <p>Всього: {result.result.total}</p>
                  <p>Відправлено: {result.result.sent}</p>
                  <p>Помилок: {result.result.errors}</p>
                </div>
              )}
            </div>
          )}

          {/* Инструкции */}
          <div className="mt-8 p-6 bg-blue-50 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-800 mb-4">
              Інструкції по розсилці
            </h3>
            <ul className="space-y-2 text-sm text-blue-700">
              <li>• Завжди спочатку тестуйте розсилку в тестовому режимі</li>
              <li>• Використовуйте HTML для красивого оформлення</li>
              <li>• Додайте текстову версію для кращої доставки</li>
              <li>• Перевірте посилання та зображення перед відправкою</li>
              <li>• Відправляйте розсилку в робочі години для кращої доставки</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
} 