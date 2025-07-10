'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Download, Search, Filter, Calendar, Mail, Shield, CheckCircle, XCircle } from 'lucide-react'

interface Consent {
  _id: string
  email: string
  sessionId?: string
  termsConsent: {
    agreed: boolean
    date: string
    ipAddress: string
    userAgent: string
  }
  marketingConsent?: {
    agreed: boolean
    date: string
    ipAddress: string
    userAgent: string
  }
  calendarContactsConsent?: {
    agreed: boolean
    date: string
    ipAddress: string
    userAgent: string
  }
  createdAt: string
  updatedAt: string
}

export default function ConsentsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [consents, setConsents] = useState<Consent[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'terms' | 'marketing' | 'calendar'>('all')
  const [updatingEmail, setUpdatingEmail] = useState<string | null>(null)
  const [deletingConsent, setDeletingConsent] = useState<string | null>(null)
  const [selectedConsents, setSelectedConsents] = useState<string[]>([])
  const [bulkDeleting, setBulkDeleting] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      router.push('/admin/signin')
      return
    }

    fetchConsents()
  }, [session, status, router])

  const fetchConsents = async () => {
    try {
      const response = await fetch('/api/admin/consents')
      if (response.ok) {
        const data = await response.json()
        setConsents(data.consents || [])
      }
    } catch (error) {
      console.error('Error fetching consents:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportConsents = async () => {
    try {
      const response = await fetch('/api/admin/consents/export')
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `consents_${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Error exporting consents:', error)
    }
  }

  const filteredConsents = consents.filter(consent => {
    const matchesSearch = consent.email 
      ? consent.email.toLowerCase().includes(searchTerm.toLowerCase())
      : searchTerm === '' // Если email null, показываем только если поиск пустой
    const matchesFilter = filterType === 'all' || 
      (filterType === 'terms' && consent.termsConsent.agreed) ||
      (filterType === 'marketing' && consent.marketingConsent?.agreed) ||
      (filterType === 'calendar' && consent.calendarContactsConsent?.agreed)
    
    return matchesSearch && matchesFilter
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('uk-UA')
  }

  const updateEmailForSession = async (sessionId: string, email: string) => {
    try {
      setUpdatingEmail(sessionId)
      
      const response = await fetch('/api/admin/consents/update-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId, email })
      })

      if (response.ok) {
        // Обновляем данные после успешного обновления
        await fetchConsents()
        alert('Email успішно оновлено!')
      } else {
        const error = await response.json()
        alert(`Помилка: ${error.error}`)
      }
    } catch (error) {
      console.error('Помилка оновлення email:', error)
      alert('Помилка оновлення email')
    } finally {
      setUpdatingEmail(null)
    }
  }

  const deleteConsent = async (consentId: string) => {
    if (!confirm('Ви впевнені, що хочете видалити цю згоду? Ця дія незворотна. Також будуть видалені всі пов\'язані дані календаря, токени користувача та відкликані дозволи у Google.')) {
      return
    }

    try {
      setDeletingConsent(consentId)
      
      const response = await fetch(`/api/admin/consents/${consentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (response.ok) {
        // Обновляем данные после успешного удаления
        await fetchConsents()
        alert('Згоду успішно видалено! Також видалені всі пов\'язані дані календаря, токени користувача та відкликані дозволи у Google.')
      } else {
        const error = await response.json()
        alert(`Помилка: ${error.error}`)
      }
    } catch (error) {
      console.error('Помилка видалення згоди:', error)
      alert('Помилка видалення згоди')
    } finally {
      setDeletingConsent(null)
    }
  }

  const handleSelectConsent = (consentId: string) => {
    setSelectedConsents(prev => 
      prev.includes(consentId) 
        ? prev.filter(id => id !== consentId)
        : [...prev, consentId]
    )
  }

  const handleSelectAll = () => {
    if (selectedConsents.length === filteredConsents.length) {
      setSelectedConsents([])
    } else {
      setSelectedConsents(filteredConsents.map(consent => consent._id))
    }
  }

  const bulkDeleteConsents = async () => {
    if (selectedConsents.length === 0) {
      alert('Виберіть згоди для видалення')
      return
    }

    if (!confirm(`Ви впевнені, що хочете видалити ${selectedConsents.length} згод? Ця дія незворотна. Також будуть видалені всі пов'язані дані календаря, токени користувачів та відкликані дозволи у Google.`)) {
      return
    }

    try {
      setBulkDeleting(true)
      
      // Удаляем согласия по одному
      for (const consentId of selectedConsents) {
        const response = await fetch(`/api/admin/consents/${consentId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          }
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(`Помилка видалення згоди ${consentId}: ${error.error}`)
        }
      }

      // Обновляем данные после успешного удаления
      await fetchConsents()
      setSelectedConsents([])
      alert(`Успішно видалено ${selectedConsents.length} згод! Також видалені всі пов'язані дані календаря, токени користувачів та відкликані дозволи у Google.`)
    } catch (error) {
      console.error('Помилка масового видалення:', error)
      alert(`Помилка: ${error}`)
    } finally {
      setBulkDeleting(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Згоди користувачів</h1>
                <p className="text-gray-600 mt-1">Управління згодами на обробку персональних даних</p>
              </div>
              <button
                onClick={exportConsents}
                className="flex items-center gap-2 bg-pink-600 text-white px-4 py-2 rounded-lg hover:bg-pink-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                Експорт
              </button>
            </div>
          </div>

          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Пошук за email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as 'all' | 'terms' | 'marketing' | 'calendar')}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                >
                  <option value="all">Всі згоди</option>
                  <option value="terms">Тільки згода з умовами</option>
                  <option value="marketing">Тільки маркетингова згода</option>
                  <option value="calendar">Тільки згода на календар і контакти</option>
                </select>
                {selectedConsents.length > 0 && (
                  <button
                    onClick={bulkDeleteConsents}
                    disabled={bulkDeleting}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    {bulkDeleting ? 'Видалення...' : `Видалити вибрані (${selectedConsents.length})`}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedConsents.length === filteredConsents.length && filteredConsents.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Згода з умовами
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Маркетингова згода
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Згода на календар і контакти
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    IP адреса
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Дата створення
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Дії
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mx-auto"></div>
                    </td>
                  </tr>
                ) : filteredConsents.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                      Згоди не знайдено
                    </td>
                  </tr>
                ) : (
                  filteredConsents.map((consent) => (
                    <tr key={consent._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedConsents.includes(consent._id)}
                          onChange={() => handleSelectConsent(consent._id)}
                          className="rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Mail className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-sm font-medium text-gray-900">
                            {consent.email || 'Не вказано'}
                          </span>
                          {!consent.email && consent.sessionId && (
                            <span className="text-xs text-gray-500 ml-2">
                              Session: {consent.sessionId.substring(0, 8)}...
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {consent.termsConsent.agreed ? (
                            <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500 mr-2" />
                          )}
                          <span className={`text-sm ${consent.termsConsent.agreed ? 'text-green-600' : 'text-red-600'}`}>
                            {consent.termsConsent.agreed ? 'Так' : 'Ні'}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {formatDate(consent.termsConsent.date)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {consent.marketingConsent?.agreed ? (
                            <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500 mr-2" />
                          )}
                          <span className={`text-sm ${consent.marketingConsent?.agreed ? 'text-green-600' : 'text-red-600'}`}>
                            {consent.marketingConsent?.agreed ? 'Так' : 'Ні'}
                          </span>
                        </div>
                        {consent.marketingConsent && (
                          <div className="text-xs text-gray-500 mt-1">
                            {formatDate(consent.marketingConsent.date)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {consent.calendarContactsConsent?.agreed ? (
                            <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500 mr-2" />
                          )}
                          <span className={`text-sm ${consent.calendarContactsConsent?.agreed ? 'text-green-600' : 'text-red-600'}`}>
                            {consent.calendarContactsConsent?.agreed ? 'Так' : 'Ні'}
                          </span>
                        </div>
                        {consent.calendarContactsConsent && (
                          <div className="text-xs text-gray-500 mt-1">
                            {formatDate(consent.calendarContactsConsent.date)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          <div className="font-medium">
                            Умови: {consent.termsConsent.ipAddress || 'Немає IP'}
                          </div>
                          {consent.marketingConsent && (
                            <div className="text-xs text-gray-500">
                              Маркетинг: {consent.marketingConsent.ipAddress || 'Немає IP'}
                            </div>
                          )}
                          {consent.calendarContactsConsent && (
                            <div className="text-xs text-gray-500">
                              Календар: {consent.calendarContactsConsent.ipAddress || 'Немає IP'}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(consent.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center space-x-2">
                          {!consent.email && consent.sessionId && (
                            <button
                              onClick={() => {
                                const email = prompt('Введіть email для цієї згоди:')
                                if (email) {
                                  updateEmailForSession(consent.sessionId!, email)
                                }
                              }}
                              disabled={updatingEmail === consent.sessionId}
                              className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 disabled:opacity-50"
                            >
                              {updatingEmail === consent.sessionId ? 'Оновлення...' : 'Додати email'}
                            </button>
                          )}
                          <button
                            onClick={() => deleteConsent(consent._id)}
                            disabled={deletingConsent === consent._id}
                            className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200 disabled:opacity-50"
                          >
                            {deletingConsent === consent._id ? 'Видалення...' : '🗑️ Видалити'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm text-gray-700">
              <span>Всього записів: {filteredConsents.length}</span>
              <span>Загальна кількість: {consents.length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 