'use client'

import { useSession, signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'

interface AdminStats {
  totalUsers: number
  totalGreetings: number
  totalPayments: number
  totalRevenue: number
  recentPayments: any[]
  publicExamples: any[]
  totalPromoCodes: number
  activePromoCodes: number
  promoUsageStats: {
    promoCode: string
    usageCount: number
    totalDiscount: number
  }[]
  totalConsents: number
  termsConsents: number
  marketingConsents: number
}

interface AppSettings {
  appName: string
  appLogo: string
  basicPlanPrice: number
  premiumPlanPrice: number
  maintenanceMode: boolean
}

interface TextBlock {
  _id?: string
  key: string
  title: string
  description: string
  icon: string
  order: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

interface PromoCode {
  _id?: string
  code: string
  discount: number
  description: string
  isActive: boolean
  usageLimit: number
  usageCount: number
  validFrom: Date
  validUntil: Date
  createdAt: Date
  updatedAt: Date
}

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([])
  const [showPromoForm, setShowPromoForm] = useState(false)
  const [editingPromo, setEditingPromo] = useState<PromoCode | null>(null)
  const [textBlocks, setTextBlocks] = useState<TextBlock[]>([])
  const [showTextBlockForm, setShowTextBlockForm] = useState(false)
  const [editingTextBlock, setEditingTextBlock] = useState<TextBlock | null>(null)

  // Проверка доступа админа
  useEffect(() => {
    if (status === 'loading') return

    console.log('🔍 Admin check:', {
      status,
      userEmail: session?.user?.email,
      isAdmin: session?.user?.email === 'seobohdanov@gmail.com'
    })

    if (session?.user?.email === 'seobohdanov@gmail.com') {
      // Пользователь является админом - загружаем данные
      console.log('✅ Admin access granted, loading data...')
      loadAdminData()
    } else if (session?.user?.email) {
      // Пользователь авторизован, но не админ - показываем сообщение об отказе
      console.log('⛔ Access denied for user:', session.user.email)
      setLoading(false)
    } else {
      // Пользователь не авторизован - показываем форму входа
      console.log('🔐 User not authenticated, showing login page')
      setLoading(false)
    }
  }, [session, status])

  const loadAdminData = async () => {
    try {
      setLoading(true)
      console.log('📊 Loading admin data...')
      
      // Загружаем статистику
      const statsResponse = await fetch('/api/admin/stats')
      console.log('📊 Stats response:', statsResponse.status, statsResponse.statusText)
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData)
        console.log('✅ Stats loaded:', statsData)
      } else {
        const error = await statsResponse.text()
        console.error('❌ Stats error:', error)
      }

      // Загружаем настройки
      const settingsResponse = await fetch('/api/admin/settings')
      console.log('⚙️ Settings response:', settingsResponse.status, settingsResponse.statusText)
      if (settingsResponse.ok) {
        const settingsData = await settingsResponse.json()
        setSettings(settingsData)
        console.log('✅ Settings loaded:', settingsData)
      } else {
        const error = await settingsResponse.text()
        console.error('❌ Settings error:', error)
      }

      // Загружаем промокоды
      const promoResponse = await fetch('/api/admin/promocodes')
      console.log('🎟️ Promo response:', promoResponse.status, promoResponse.statusText)
      if (promoResponse.ok) {
        const promoData = await promoResponse.json()
        setPromoCodes(promoData)
        console.log('✅ Promo codes loaded:', promoData)
      } else {
        const error = await promoResponse.text()
        console.error('❌ Promo codes error:', error)
      }

      // Загружаем текстовые блоки
      const textBlocksResponse = await fetch('/api/admin/text-blocks')
      console.log('📝 Text blocks response:', textBlocksResponse.status, textBlocksResponse.statusText)
      if (textBlocksResponse.ok) {
        const textBlocksData = await textBlocksResponse.json()
        setTextBlocks(textBlocksData)
        console.log('✅ Text blocks loaded:', textBlocksData)
      } else {
        const error = await textBlocksResponse.text()
        console.error('❌ Text blocks error:', error)
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки данных админки:', error)
      toast.error('Ошибка загрузки данных')
    } finally {
      setLoading(false)
    }
  }

  const loadPromoCodes = async () => {
    try {
      const response = await fetch('/api/admin/promocodes')
      if (response.ok) {
        const data = await response.json()
        setPromoCodes(data)
      }
    } catch (error) {
      console.error('Ошибка загрузки промокодов:', error)
      toast.error('Ошибка загрузки промокодов')
    }
  }

  const savePromoCode = async (promoData: Partial<PromoCode>) => {
    try {
      const method = editingPromo ? 'PUT' : 'POST'
      const url = editingPromo ? `/api/admin/promocodes/${editingPromo._id}` : '/api/admin/promocodes'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(promoData)
      })

      if (response.ok) {
        toast.success(editingPromo ? 'Промокод обновлен' : 'Промокод создан')
        setShowPromoForm(false)
        setEditingPromo(null)
        loadPromoCodes()
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Ошибка сохранения промокода')
      }
    } catch (error) {
      console.error('Ошибка сохранения промокода:', error)
      toast.error(error instanceof Error ? error.message : 'Ошибка сохранения промокода')
    }
  }

  const deletePromoCode = async (promoId: string) => {
    if (!confirm('Удалить этот промокод?')) return

    try {
      const response = await fetch(`/api/admin/promocodes/${promoId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Промокод удален')
        loadPromoCodes()
      } else {
        throw new Error('Ошибка удаления промокода')
      }
    } catch (error) {
      console.error('Ошибка удаления промокода:', error)
      toast.error('Ошибка удаления промокода')
    }
  }

  const togglePromoCodeStatus = async (promoId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/admin/promocodes/${promoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive })
      })

      if (response.ok) {
        toast.success(`Промокод ${isActive ? 'активирован' : 'деактивирован'}`)
        loadPromoCodes()
      } else {
        throw new Error('Ошибка обновления промокода')
      }
    } catch (error) {
      console.error('Ошибка обновления промокода:', error)
      toast.error('Ошибка обновления промокода')
    }
  }

  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      })

      if (response.ok) {
        setSettings(prev => prev ? { ...prev, ...newSettings } : null)
        toast.success('Настройки обновлены')
      } else {
        throw new Error('Ошибка обновления настроек')
      }
    } catch (error) {
      console.error('Ошибка обновления настроек:', error)
      toast.error('Ошибка обновления настроек')
    }
  }

  const deleteExample = async (exampleId: string) => {
    if (!confirm('Удалить этот пример?')) return

    try {
      const response = await fetch(`/api/admin/examples/${exampleId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Пример удален')
        loadAdminData() // Перезагружаем данные
      } else {
        throw new Error('Ошибка удаления примера')
      }
    } catch (error) {
      console.error('Ошибка удаления примера:', error)
      toast.error('Ошибка удаления примера')
    }
  }

  const loadTextBlocks = async () => {
    try {
      const response = await fetch('/api/admin/text-blocks')
      if (response.ok) {
        const data = await response.json()
        setTextBlocks(data)
      }
    } catch (error) {
      console.error('Ошибка загрузки текстовых блоков:', error)
      toast.error('Ошибка загрузки текстовых блоков')
    }
  }

  const saveTextBlock = async (textBlockData: Partial<TextBlock>) => {
    try {
      const method = editingTextBlock ? 'PUT' : 'POST'
      const url = editingTextBlock ? `/api/admin/text-blocks/${editingTextBlock._id}` : '/api/admin/text-blocks'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(textBlockData)
      })

      if (response.ok) {
        toast.success(editingTextBlock ? 'Текстовый блок обновлен' : 'Текстовый блок создан')
        setShowTextBlockForm(false)
        setEditingTextBlock(null)
        loadTextBlocks()
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Ошибка сохранения текстового блока')
      }
    } catch (error) {
      console.error('Ошибка сохранения текстового блока:', error)
      toast.error(error instanceof Error ? error.message : 'Ошибка сохранения текстового блока')
    }
  }

  const deleteTextBlock = async (textBlockId: string) => {
    if (!confirm('Удалить этот текстовый блок?')) return

    try {
      const response = await fetch(`/api/admin/text-blocks/${textBlockId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Текстовый блок удален')
        loadTextBlocks()
      } else {
        throw new Error('Ошибка удаления текстового блока')
      }
    } catch (error) {
      console.error('Ошибка удаления текстового блока:', error)
      toast.error('Ошибка удаления текстового блока')
    }
  }

  const toggleTextBlockStatus = async (textBlockId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/admin/text-blocks/${textBlockId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive })
      })

      if (response.ok) {
        toast.success(`Текстовый блок ${isActive ? 'активирован' : 'деактивирован'}`)
        loadTextBlocks()
      } else {
        throw new Error('Ошибка обновления текстового блока')
      }
    } catch (error) {
      console.error('Ошибка обновления текстового блока:', error)
      toast.error('Ошибка обновления текстового блока')
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка админ-панели...</p>
        </div>
      </div>
    )
  }

  // Если пользователь не авторизован - показываем форму входа
  if (!session?.user?.email) {
    return <AdminLoginPage />
  }

  // Если пользователь авторизован, но не админ - показываем отказ в доступе
  if (session.user.email !== 'seobohdanov@gmail.com') {
    return <AdminAccessDeniedPage userEmail={session.user.email} />
  }

  // Пользователь является админом - показываем админ-панель
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Заголовок */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Админ-панель</h1>
              <span className="ml-4 px-3 py-1 bg-purple-100 text-purple-800 text-sm rounded-full">
                {settings?.appName || 'Spivanka'}
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Привет, {session.user.name}
              </span>
              <button
                onClick={() => router.push('/')}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                На главную
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Навигация */}
        <div className="mb-8">
          <nav className="flex flex-wrap gap-2 lg:gap-4">
            {[
              { id: 'dashboard', name: 'Дашборд', icon: '📊' },
              { id: 'settings', name: 'Настройки', icon: '⚙️' },
              { id: 'examples', name: 'Примеры', icon: '🎵' },
              { id: 'payments', name: 'Платежи', icon: '💳' },
              { id: 'users', name: 'Пользователи', icon: '👥' },
              { id: 'promocodes', name: 'Промокоды', icon: '🎟️' },
              { id: 'textblocks', name: 'Текстовые блоки', icon: '📝' },
              { id: 'marketing', name: 'Розсилка', icon: '📧' },
              { id: 'consents', name: 'Згоди', icon: '✅' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-2 py-2 rounded-md text-xs lg:text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-purple-100 text-purple-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <span className="mr-1 lg:mr-2">{tab.icon}</span>
                <span className="hidden sm:inline">{tab.name}</span>
                <span className="sm:hidden">{tab.name.substring(0, 3)}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Дашборд */}
        {activeTab === 'dashboard' && stats && (
          <div className="space-y-6">
            {/* Статистика */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <span className="text-2xl">👥</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Пользователи</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <span className="text-2xl">🎵</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Приветствия</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalGreetings}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <span className="text-2xl">💳</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Платежи</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalPayments}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <span className="text-2xl">💰</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Доход</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalRevenue} ₴</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <span className="text-2xl">🎟️</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Промокоды</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalPromoCodes}</p>
                    <p className="text-xs text-gray-500">Активных: {stats.activePromoCodes}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <span className="text-2xl">✅</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Згоди</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalConsents}</p>
                    <p className="text-xs text-gray-500">
                      Умови: {stats.termsConsents} | Маркетинг: {stats.marketingConsents}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Статистика промокодов */}
            {stats.promoUsageStats.length > 0 && (
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b">
                  <h3 className="text-lg font-medium text-gray-900">Популярные промокоды</h3>
                </div>
                <div className="p-6">
                  <div className="grid gap-4">
                    {stats.promoUsageStats.map((promo, index) => (
                      <div key={promo.promoCode} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center justify-center w-8 h-8 bg-purple-100 text-purple-800 rounded-full text-sm font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-900">{promo.promoCode}</h4>
                            <p className="text-sm text-gray-600">Использований: {promo.usageCount} раз</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-green-600">-{promo.totalDiscount}%</p>
                          <p className="text-xs text-gray-500">Общая скидка</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Последние платежи */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b">
                <h3 className="text-lg font-medium text-gray-900">Последние платежи</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Пользователь</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Сумма</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Дата</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {stats.recentPayments.map((payment, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {payment.userEmail}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {payment.amount} ₴
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(payment.createdAt).toLocaleDateString('uk-UA')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            payment.status === 'success' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {payment.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Настройки */}
        {activeTab === 'settings' && settings && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Основные настройки</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Название приложения</label>
                  <input
                    type="text"
                    value={settings.appName}
                    onChange={(e) => setSettings(prev => prev ? {...prev, appName: e.target.value} : null)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Логотип</label>
                  <div className="mt-1 flex items-center space-x-4">
                    {settings.appLogo && (
                      <div className="flex items-center space-x-2">
                        <img 
                          src={settings.appLogo} 
                          alt="Логотип" 
                          className="w-12 h-12 object-contain border rounded"
                        />
                        <button
                          type="button"
                          onClick={() => setSettings(prev => prev ? {...prev, appLogo: ''} : null)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Удалить
                        </button>
                      </div>
                    )}
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            try {
                              const formData = new FormData()
                              formData.append('logo', file)
                              
                              const response = await fetch('/api/admin/upload-logo', {
                                method: 'POST',
                                body: formData
                              })
                              
                              if (response.ok) {
                                const data = await response.json()
                                setSettings(prev => prev ? {...prev, appLogo: data.fileUrl} : null)
                                toast.success('Логотип загружен')
                              } else {
                                const error = await response.json()
                                toast.error(error.error || 'Ошибка загрузки файла')
                              }
                            } catch (error) {
                              console.error('Ошибка загрузки:', error)
                              toast.error('Ошибка загрузки файла')
                            }
                          }
                        }}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Поддерживаемые форматы: JPG, PNG, GIF. Максимальный размер: 5MB
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Цена базового плана (₴)</label>
                    <input
                      type="number"
                      value={settings.basicPlanPrice}
                      onChange={(e) => setSettings(prev => prev ? {...prev, basicPlanPrice: Number(e.target.value)} : null)}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Цена премиум плана (₴)</label>
                    <input
                      type="number"
                      value={settings.premiumPlanPrice}
                      onChange={(e) => setSettings(prev => prev ? {...prev, premiumPlanPrice: Number(e.target.value)} : null)}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.maintenanceMode}
                    onChange={(e) => setSettings(prev => prev ? {...prev, maintenanceMode: e.target.checked} : null)}
                    className="h-4 w-4 text-purple-600 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-900">
                    Режим обслуживания (отключить приложение)
                  </label>
                </div>

                <button
                  onClick={() => updateSettings(settings)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Сохранить настройки
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Примеры */}
        {activeTab === 'examples' && stats && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-medium text-gray-900">Публичные примеры</h3>
            </div>
            <div className="p-6">
              <div className="grid gap-4">
                {stats.publicExamples.map((example) => (
                  <div key={example.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{example.recipientName}</h4>
                      <p className="text-sm text-gray-600">{example.occasion} • {example.relationship}</p>
                      <p className="text-xs text-gray-500">
                        Создан: {new Date(example.createdAt).toLocaleDateString('uk-UA')}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {example.musicUrl && (
                        <a
                          href={example.musicUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
                        >
                          🎵 Прослушать
                        </a>
                      )}
                      <button
                        onClick={() => deleteExample(example.id)}
                        className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                      >
                        🗑️ Удалить
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Заглушки для других вкладок */}
        {activeTab === 'payments' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Управление платежами</h3>
            <p className="text-gray-600">Здесь будет детальная информация о всех платежах...</p>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Управление пользователями</h3>
            <p className="text-gray-600">Здесь будет список всех пользователей...</p>
          </div>
        )}

        {/* Промокоды */}
        {activeTab === 'promocodes' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Управление промокодами</h3>
                <button
                  onClick={() => {
                    setEditingPromo(null)
                    setShowPromoForm(true)
                  }}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  + Создать промокод
                </button>
              </div>
              
              <div className="p-6">
                <div className="grid gap-4">
                  {promoCodes.map((promo) => (
                    <div key={promo._id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h4 className="font-bold text-lg text-gray-900">{promo.code}</h4>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            promo.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {promo.isActive ? 'Активен' : 'Неактивен'}
                          </span>
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                            -{promo.discount}%
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{promo.description}</p>
                        <div className="text-xs text-gray-500 mt-2 space-y-1">
                          <div>Использований: {promo.usageCount} / {promo.usageLimit === 0 ? '∞' : promo.usageLimit}</div>
                          <div>Действует: {new Date(promo.validFrom).toLocaleDateString('uk-UA')} - {new Date(promo.validUntil).toLocaleDateString('uk-UA')}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => togglePromoCodeStatus(promo._id!, !promo.isActive)}
                          className={`px-3 py-1 rounded text-sm ${
                            promo.isActive
                              ? 'bg-red-100 text-red-700 hover:bg-red-200'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                        >
                          {promo.isActive ? '🔒 Деактивировать' : '🔓 Активировать'}
                        </button>
                        <button
                          onClick={() => {
                            setEditingPromo(promo)
                            setShowPromoForm(true)
                          }}
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
                        >
                          ✏️ Редактировать
                        </button>
                        <button
                          onClick={() => deletePromoCode(promo._id!)}
                          className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                        >
                          🗑️ Удалить
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {promoCodes.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <p>Промокоды не найдены</p>
                      <p className="text-sm">Создайте первый промокод для начала работы</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Текстовые блоки */}
        {activeTab === 'textblocks' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Текстовые блоки главной страницы</h3>
                <button
                  onClick={() => {
                    setEditingTextBlock(null)
                    setShowTextBlockForm(true)
                  }}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  ➕ Добавить блок
                </button>
              </div>
              
              <div className="p-6">
                <div className="grid gap-4">
                  {textBlocks.map((block) => (
                    <div key={block._id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="text-2xl">{block.icon}</div>
                          <div>
                            <h4 className="font-bold text-gray-900">{block.title}</h4>
                            <p className="text-sm text-gray-600">{block.description}</p>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className="text-xs text-gray-500">Ключ: {block.key}</span>
                              <span className="text-xs text-gray-500">Порядок: {block.order}</span>
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                block.isActive 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {block.isActive ? 'Активен' : 'Неактивен'}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => toggleTextBlockStatus(block._id!, !block.isActive)}
                            className={`px-3 py-1 rounded text-sm ${
                              block.isActive 
                                ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                          >
                            {block.isActive ? '🔒 Деактивировать' : '🔓 Активировать'}
                          </button>
                          <button
                            onClick={() => {
                              setEditingTextBlock(block)
                              setShowTextBlockForm(true)
                            }}
                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
                          >
                            ✏️ Редактировать
                          </button>
                          <button
                            onClick={() => deleteTextBlock(block._id!)}
                            className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                          >
                            🗑️ Удалить
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {textBlocks.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <p>Текстовые блоки не найдены</p>
                      <p className="text-sm">Создайте первый текстовый блок для главной страницы</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Маркетинговая рассылка */}
        {activeTab === 'marketing' && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center">
                <span className="text-blue-600 mr-2">📧</span>
                <div className="text-sm text-blue-800">
                  <strong>Маркетингова розсилка</strong>
                  <br />
                  Відправляйте email листи користувачам з згодою на маркетинг
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <a
                href="/admin/marketing"
                className="bg-pink-600 text-white px-6 py-3 rounded-lg hover:bg-pink-700 transition-colors"
              >
                Перейти до розсилки
              </a>
            </div>
          </div>
        )}

        {/* Управление согласиями */}
        {activeTab === 'consents' && (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center">
                <span className="text-green-600 mr-2">✅</span>
                <div className="text-sm text-green-800">
                  <strong>Управління згодами</strong>
                  <br />
                  Переглядайте та експортуйте згоди користувачів на обробку даних
                </div>
              </div>
            </div>

            <div className="flex justify-center space-x-4">
              <a
                href="/admin/consents"
                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
              >
                Перейти до згод
              </a>

            </div>
          </div>
        )}
      </div>

      {/* Модальное окно для создания/редактирования промокода */}
      {showPromoForm && (
        <PromoCodeForm
          promo={editingPromo}
          onSave={savePromoCode}
          onCancel={() => {
            setShowPromoForm(false)
            setEditingPromo(null)
          }}
        />
      )}

      {/* Модальное окно для создания/редактирования текстового блока */}
      {showTextBlockForm && (
        <TextBlockForm
          textBlock={editingTextBlock}
          onSave={saveTextBlock}
          onCancel={() => {
            setShowTextBlockForm(false)
            setEditingTextBlock(null)
          }}
        />
      )}
    </div>
  )
}

// Компонент формы для промокодов
interface PromoCodeFormProps {
  promo: PromoCode | null
  onSave: (data: Partial<PromoCode>) => void
  onCancel: () => void
}

const PromoCodeForm: React.FC<PromoCodeFormProps> = ({ promo, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    code: promo?.code || '',
    discount: promo?.discount || 10,
    description: promo?.description || '',
    isActive: promo?.isActive ?? true,
    usageLimit: promo?.usageLimit || 0,
    validFrom: promo?.validFrom ? new Date(promo.validFrom).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    validUntil: promo?.validUntil ? new Date(promo.validUntil).toISOString().split('T')[0] : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.code.trim()) {
      toast.error('Введите код промокода')
      return
    }

    if (formData.discount < 1 || formData.discount > 100) {
      toast.error('Размер скидки должен быть от 1% до 100%')
      return
    }

    if (new Date(formData.validFrom) >= new Date(formData.validUntil)) {
      toast.error('Дата окончания должна быть позже даты начала')
      return
    }

    onSave({
      code: formData.code.toUpperCase().trim(),
      discount: formData.discount,
      description: formData.description.trim(),
      isActive: formData.isActive,
      usageLimit: formData.usageLimit,
      validFrom: new Date(formData.validFrom),
      validUntil: new Date(formData.validUntil)
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {promo ? 'Редактировать промокод' : 'Создать промокод'}
          </h2>
          <p className="text-gray-600">
            Настройте параметры промокода для предоставления скидок пользователям
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Код промокода *
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="НОВЫЙ2024"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Будет автоматически преобразован в верхний регистр</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Размер скидки (%) *
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={formData.discount}
                onChange={(e) => setFormData(prev => ({ ...prev, discount: Number(e.target.value) }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Описание
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Скидка для новых пользователей"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Дата начала действия *
              </label>
              <input
                type="date"
                value={formData.validFrom}
                onChange={(e) => setFormData(prev => ({ ...prev, validFrom: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Дата окончания действия *
              </label>
              <input
                type="date"
                value={formData.validUntil}
                onChange={(e) => setFormData(prev => ({ ...prev, validUntil: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Лимит использований
            </label>
            <input
              type="number"
              min="0"
              value={formData.usageLimit}
              onChange={(e) => setFormData(prev => ({ ...prev, usageLimit: Number(e.target.value) }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="0 = без лимита"
            />
            <p className="text-xs text-gray-500 mt-1">0 означает неограниченное количество использований</p>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
              className="h-4 w-4 text-purple-600 border-gray-300 rounded"
            />
            <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
              Активировать промокод сразу после создания
            </label>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              className="flex-1 bg-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
            >
              {promo ? 'Обновить промокод' : 'Создать промокод'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-gray-200 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
            >
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Компонент формы для текстовых блоков
interface TextBlockFormProps {
  textBlock: TextBlock | null
  onSave: (data: Partial<TextBlock>) => void
  onCancel: () => void
}

const TextBlockForm: React.FC<TextBlockFormProps> = ({ textBlock, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    key: textBlock?.key || '',
    title: textBlock?.title || '',
    description: textBlock?.description || '',
    icon: textBlock?.icon || '🎵',
    order: textBlock?.order || 1,
    isActive: textBlock?.isActive ?? true
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.key.trim()) {
      toast.error('Введите ключ блока')
      return
    }

    if (!formData.title.trim()) {
      toast.error('Введите заголовок блока')
      return
    }

    if (!formData.description.trim()) {
      toast.error('Введите описание блока')
      return
    }

    onSave({
      key: formData.key.trim(),
      title: formData.title.trim(),
      description: formData.description.trim(),
      icon: formData.icon,
      order: formData.order,
      isActive: formData.isActive
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {textBlock ? 'Редактировать текстовый блок' : 'Создать текстовый блок'}
          </h2>
          <p className="text-gray-600">
            Настройте текстовый блок для отображения на главной странице
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ключ блока *
              </label>
              <input
                type="text"
                value={formData.key}
                onChange={(e) => setFormData(prev => ({ ...prev, key: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="uniqueMusic"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Уникальный идентификатор блока</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Иконка
              </label>
              <input
                type="text"
                value={formData.icon}
                onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="🎵"
              />
              <p className="text-xs text-gray-500 mt-1">Эмодзи для отображения</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Заголовок *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Унікальна музика"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Описание *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Suno AI генерує повні музичні композиції (~2 хв) протягом 1-3 хвилин"
              rows={3}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Порядок отображения
              </label>
              <input
                type="number"
                min="1"
                value={formData.order}
                onChange={(e) => setFormData(prev => ({ ...prev, order: Number(e.target.value) }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Чем меньше число, тем выше блок</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Статус
              </label>
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={() => setFormData(prev => ({ ...prev, isActive: true }))}
                    className="mr-2"
                  />
                  Активен
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="isActive"
                    checked={!formData.isActive}
                    onChange={() => setFormData(prev => ({ ...prev, isActive: false }))}
                    className="mr-2"
                  />
                  Неактивен
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-4 pt-6 border-t">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              {textBlock ? 'Обновить' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Компонент страницы входа для админов
const AdminLoginPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-800 to-blue-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-3xl">🔐</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Админ-панель</h1>
            <p className="text-gray-600">Вход для администраторов</p>
          </div>

          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center">
                <span className="text-blue-600 mr-2">ℹ️</span>
                <div className="text-sm text-blue-800">
                  <strong>Доступ только для администраторов</strong>
                  <br />
                  Войдите с помощью аккаунта администратора
                </div>
              </div>
            </div>

            <button
              onClick={() => signIn('google', { callbackUrl: '/admin' })}
              className="w-full flex items-center justify-center px-6 py-3 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Войти через Google
            </button>

            <div className="text-center">
              <a
                href="/"
                className="text-sm text-purple-600 hover:text-purple-700 transition-colors"
              >
                ← Вернуться на главную
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-white/80 text-sm">
            🎵 <strong>Spivanka</strong> - Создание музыкальных поздравлений
          </p>
        </div>
      </div>
    </div>
  )
}

// Компонент страницы отказа в доступе
interface AdminAccessDeniedPageProps {
  userEmail: string
}

const AdminAccessDeniedPage: React.FC<AdminAccessDeniedPageProps> = ({ userEmail }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-pink-800 to-purple-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-3xl">⛔</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Доступ запрещен</h1>
            <p className="text-gray-600">У вас нет прав администратора</p>
          </div>

          <div className="space-y-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <span className="text-red-600 mr-2">🚫</span>
                <div className="text-sm text-red-800">
                  <strong>Ошибка авторизации</strong>
                  <br />
                  Аккаунт <code className="bg-red-100 px-1 rounded">{userEmail}</code> не имеет прав администратора
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center">
                <span className="text-blue-600 mr-2">💡</span>
                <div className="text-sm text-blue-800">
                  <strong>Что делать?</strong>
                  <br />
                  Обратитесь к администратору системы для получения доступа
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <a
                href="/"
                className="flex-1 bg-gray-200 text-gray-700 py-3 px-4 rounded-lg font-semibold hover:bg-gray-300 transition-colors text-center"
              >
                На главную
              </a>
              <button
                onClick={() => signIn('google', { callbackUrl: '/admin' })}
                className="flex-1 bg-purple-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
              >
                Другой аккаунт
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-white/80 text-sm">
            🎵 <strong>Spivanka</strong> - Создание музыкальных поздравлений
          </p>
        </div>
      </div>
    </div>
  )
} 