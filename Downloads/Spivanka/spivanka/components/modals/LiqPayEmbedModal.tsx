'use client'

import React, { useState, useEffect } from 'react'
import { X, CreditCard, Shield, CheckCircle } from 'lucide-react'

interface LiqPayEmbedModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  amount: number
  plan: 'basic' | 'premium'
  promoDiscount: number
}

declare global {
  interface Window {
    LiqPay: any
  }
}

export const LiqPayEmbedModal: React.FC<LiqPayEmbedModalProps> = ({
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

  const finalAmount = Math.round(amount * (1 - promoDiscount / 100))

  useEffect(() => {
    if (isOpen) {
      // Проверяем, находимся ли мы в локальной разработке
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      const isHttp = window.location.protocol === 'http:'
      
      if (isLocalhost && isHttp) {
        setIsDemoMode(true)
        setIsLoading(false)
      } else {
        loadLiqPayScript()
        createPaymentData()
      }
    }
  }, [isOpen])

  const loadLiqPayScript = () => {
    if (window.LiqPay) return

    const script = document.createElement('script')
    script.src = 'https://static.liqpay.ua/libjs/checkout.js'
    script.async = true
    script.onload = () => {
      console.log('LiqPay script loaded')
    }
    script.onerror = () => {
      setError('Помилка завантаження LiqPay')
    }
    document.head.appendChild(script)
  }

  const createPaymentData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/payment/liqpay', {
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
        setPaymentData(result.embedData)
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

  const handleLiqPayCheckout = () => {
    if (!window.LiqPay || !paymentData) return

    window.LiqPay.checkout({
      data: paymentData.data,
      signature: paymentData.signature,
      embedTo: '#liqpay-embed',
      mode: 'embed', // embed, popup, redirect
      language: 'uk',
      sandbox: process.env.NODE_ENV === 'development' ? 1 : 0,
      onSuccess: function(data: any) {
        console.log('LiqPay success:', data)
        onClose()
        onSuccess()
      },
      onError: function(error: any) {
        console.error('LiqPay error:', error)
        setError('Помилка оплати')
      }
    })
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
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"
        >
          <X size={24} />
        </button>

        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Оплата через LiqPay
          </h2>
          <p className="text-gray-600">
            Безпечна оплата для створення вашого привітання
          </p>
        </div>

        <div className="mb-6">
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">План:</span>
              <span className="font-semibold capitalize">{plan}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Вартість:</span>
              <span className="font-semibold">{amount} грн</span>
            </div>
            {promoDiscount > 0 && (
              <div className="flex justify-between items-center text-green-600">
                <span>Знижка:</span>
                <span>-{promoDiscount}%</span>
              </div>
            )}
            <div className="flex justify-between items-center text-lg font-bold border-t pt-2 mt-2">
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
                <p className="text-yellow-800 text-sm">
                  <strong>Режим розробки:</strong> Показується демо-форма оплати. 
                  Для тестування реальної оплати використовуйте HTTPS.
                </p>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
              <div className="text-center mb-6">
                <CreditCard className="mx-auto text-gray-400 mb-4" size={48} />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  Демо-форма оплати LiqPay
                </h3>
                <p className="text-gray-600 text-sm">
                  В реальному середовищі тут буде форма LiqPay
                </p>
              </div>

              <div className="space-y-3 mb-6">
                <div className="bg-white rounded border p-3">
                  <div className="text-sm text-gray-500 mb-1">Номер картки</div>
                  <div className="text-gray-700 font-mono">**** **** **** 1234</div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded border p-3">
                    <div className="text-sm text-gray-500 mb-1">Термін дії</div>
                    <div className="text-gray-700">12/25</div>
                  </div>
                  <div className="bg-white rounded border p-3">
                    <div className="text-sm text-gray-500 mb-1">CVV</div>
                    <div className="text-gray-700">***</div>
                  </div>
                </div>
              </div>

              <button
                onClick={handleDemoPayment}
                disabled={isProcessing}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Обробка платежу...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2" size={20} />
                    Оплатити {finalAmount} грн (Демо)
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {!isDemoMode && isLoading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Завантаження форми оплати...</p>
          </div>
        )}

        {!isDemoMode && error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-800">{error}</p>
            <button
              onClick={createPaymentData}
              className="mt-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700"
            >
              Спробувати ще раз
            </button>
          </div>
        )}

        {!isDemoMode && !isLoading && !error && paymentData && (
          <div className="space-y-4">
            <div id="liqpay-embed" className="min-h-[400px] border border-gray-200 rounded-lg">
              {/* Здесь будет встроена форма LiqPay */}
            </div>
            
            <button
              onClick={handleLiqPayCheckout}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all"
            >
              Оплатити {finalAmount} грн
            </button>
          </div>
        )}

        <p className="text-xs text-gray-500 text-center mt-4">
          Оплата обробляється безпечно через LiqPay
        </p>
      </div>
    </div>
  )
} 