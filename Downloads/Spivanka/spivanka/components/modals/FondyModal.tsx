'use client'

import React, { useState, useEffect, useRef } from 'react'
import { X, CreditCard, Shield, CheckCircle } from 'lucide-react'

interface FondyModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  amount: number
  plan: 'basic' | 'premium'
  promoDiscount: number
}

declare global {
  interface Window {
    fondy: any
    fondyCallback?: (data: any) => void
  }
}

export const FondyModal: React.FC<FondyModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  amount,
  plan,
  promoDiscount
}) => {
  const [isLoading, setIsLoading] = useState(true)
  const [paymentData, setPaymentData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [widgetInitialized, setWidgetInitialized] = useState(false)
  const widgetRef = useRef<HTMLDivElement>(null)

  const finalAmount = Math.round(amount * (1 - promoDiscount / 100))

  useEffect(() => {
    if (isOpen) {
      // Проверяем, находимся ли мы в локальной разработке
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      const isHttp = window.location.protocol === 'http:'
      
      // ВРЕМЕННО: показываем демо-режим пока merchant на модерации
      const isMerchantUnderReview = true // TODO: убрать когда merchant активируется
      
      if ((isLocalhost && isHttp) || isMerchantUnderReview) {
        setIsDemoMode(true)
        setIsLoading(false)
      } else {
        createPaymentData()
      }
    }
  }, [isOpen])

  useEffect(() => {
    // Инициализируем виджет после получения данных платежа
    if (paymentData && !widgetInitialized && !isDemoMode) {
      initializeFondyWidget()
    }
  }, [paymentData, widgetInitialized, isDemoMode])

  const loadFondyScript = () => {
    // Проверяем, загружен ли уже скрипт
    if (document.querySelector('script[src*="checkout.js"]')) {
      createPaymentData()
      return
    }

    const script = document.createElement('script')
    script.src = 'https://pay.fondy.eu/latest/checkout-vue/checkout.js'
    script.async = true
    script.onload = () => {
      console.log('Fondy script loaded')
      createPaymentData()
    }
    script.onerror = () => {
      setError('Помилка завантаження Fondy')
      setIsLoading(false)
    }
    document.head.appendChild(script)
  }

  const createPaymentData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/payment/fondy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: finalAmount,
          description: `Створення музичного привітання - ${plan} план`,
          orderId: `order_${Date.now()}_${Math.random().toString(36).substring(7)}`
        })
      })

      const result = await response.json()
      
      if (result.success) {
        setPaymentData(result.paymentData)
        setIsLoading(false)
      } else {
        throw new Error(result.error || 'Помилка створення платежу')
      }
    } catch (error) {
      console.error('Error creating payment:', error)
      setError('Помилка створення платежу')
      setIsLoading(false)
    }
  }

  const initializeFondyWidget = () => {
    if (!window.fondy || !paymentData || widgetInitialized) return

    try {
      console.log('Initializing Fondy widget...')
      console.log('Payment data:', paymentData)

      // Очищаем контейнер перед инициализацией
      if (widgetRef.current) {
        widgetRef.current.innerHTML = ''
      }

      // Создаем глобальный callback для Fondy
      window.fondyCallback = function(data: any) {
        console.log('Fondy callback received:', data)
        if (data.order_status === 'approved') {
          console.log('Payment approved:', data)
          onClose()
          onSuccess()
        } else if (data.order_status === 'declined') {
          console.error('Payment declined:', data)
          setError('Платіж відхилено: ' + (data.response_description || 'Невідома помилка'))
        } else if (data.order_status === 'processing') {
          console.log('Payment processing:', data)
        } else {
          console.log('Other payment status:', data)
        }
      }

      // Конфігурація з Google Pay та Apple Pay
      const config = {
        params: {
          merchant_id: paymentData.merchant_id,
          amount: paymentData.amount,
          currency: paymentData.currency,
          order_desc: paymentData.order_desc,
          order_id: paymentData.order_id,
          response_url: paymentData.response_url,
          server_callback_url: paymentData.server_callback_url,
          signature: paymentData.signature,
          lang: 'uk'
        },
        options: {
          methods: ['card', 'wallets'],
          default_country: 'UA',
          lang: 'uk',
          hide_title: true,
          button: true,
          full_screen: false,
          active_tab: 'card'
        }
      }

      console.log('Fondy widget config:', config)
      
      // Инициализируем виджет
      const result = window.fondy("#fondy-ua-checkout", config)
      console.log('Fondy widget initialization result:', result)

      setWidgetInitialized(true)
      console.log('Fondy widget initialized successfully')
    } catch (error) {
      console.error('Fondy widget initialization error:', error)
      setError('Помилка ініціалізації віджету платежу: ' + (error instanceof Error ? error.message : 'Невідома помилка'))
    }
  }

  const handleDemoPayment = async () => {
    setIsProcessing(true)
    
    // Симуляция обработки платежа
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    setIsProcessing(false)
    onClose()
    onSuccess()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-4 relative max-h-[80vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 z-10"
        >
          <X size={20} />
        </button>

        <div className="text-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 mb-1">
            Оплата через Fondy
          </h2>
          <p className="text-sm text-gray-600">
            Безпечна оплата для створення вашого привітання
          </p>
        </div>

        <div className="mb-4">
          <div className="bg-gray-50 rounded-lg p-3 mb-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">План:</span>
              <span className="font-semibold capitalize">{plan}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Вартість:</span>
              <span className="font-semibold">{amount} грн</span>
            </div>
            {promoDiscount > 0 && (
              <div className="flex justify-between items-center text-sm text-green-600">
                <span>Знижка:</span>
                <span>-{promoDiscount}%</span>
              </div>
            )}
            <div className="flex justify-between items-center font-bold border-t pt-2 mt-2">
              <span>Разом:</span>
              <span>{finalAmount} грн</span>
            </div>
          </div>
        </div>

        {isDemoMode && (
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <div className="flex items-center">
                <Shield className="text-yellow-600 mr-2" size={20} />
                <div className="text-sm text-yellow-800">
                  <strong>Демо-режим</strong> - Merchant account на модерації у Fondy
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-gray-800">💳 Тестові дані для оплати:</h3>
              <div className="grid grid-cols-1 gap-2 text-sm">
                <div><strong>Номер картки:</strong> 4444 5555 6666 1111</div>
                <div><strong>Термін дії:</strong> 12/25</div>
                <div><strong>CVV:</strong> 123</div>
                <div><strong>Власник картки:</strong> ТАРАС ШЕВЧЕНКО</div>
              </div>
              <div className="text-xs text-gray-600 mt-2">
                ⚠️ Це тестові дані. Реальні гроші не списуються.
                <br />
                Після активації merchant account буде доступна реальна оплата.
              </div>
            </div>

            <button
              onClick={() => {
                // Симуляция успешной оплаты
                setTimeout(() => {
                  onSuccess()
                }, 1000)
              }}
              className="w-full bg-gradient-to-r from-blue-600 to-yellow-500 text-white py-3 px-4 rounded-lg font-semibold hover:from-blue-700 hover:to-yellow-600 transition-all shadow-lg"
            >
              Симуляція успішної оплати 🇺🇦
            </button>
          </div>
        )}

        {!isDemoMode && isLoading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Завантаження віджету Fondy...</p>
          </div>
        )}

        {!isDemoMode && error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-800">{error}</p>
            <button
              onClick={() => {
                setError(null)
                setWidgetInitialized(false)
                createPaymentData()
              }}
              className="mt-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700"
            >
              Спробувати ще раз
            </button>
          </div>
        )}

        {!isDemoMode && !isLoading && !error && paymentData && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-center">
                <CreditCard className="text-blue-600 mr-2" size={20} />
                <div className="text-sm text-blue-800">
                  <strong>Віджет Fondy</strong> - Картки + Google Pay + Apple Pay
                </div>
              </div>
            </div>
            
            <div 
              id="fondy-ua-checkout" 
              ref={widgetRef}
              className="min-h-[400px] border border-gray-200 rounded-lg p-4 bg-white"
            >
              {/* Здесь будет встроен виджет Fondy */}
            </div>
            
            {!widgetInitialized && (
              <div className="text-center py-4">
                <button
                  onClick={initializeFondyWidget}
                  className="bg-gradient-to-r from-blue-600 to-yellow-500 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-700 hover:to-yellow-600 transition-all shadow-lg"
                >
                  Ініціалізувати віджет оплати 🇺🇦
                </button>
              </div>
            )}
          </div>
        )}

        <p className="text-xs text-gray-500 text-center mt-4">
          Оплата обробляється безпечно через Fondy
        </p>
      </div>
    </div>
  )
} 