'use client'

import React, { useState } from 'react'
import { X, Globe } from 'lucide-react'
import { useAppSettings } from '@/hooks/useAppSettings'

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  onPayment: () => void
  plan: 'basic' | 'premium'
  promoDiscount: number
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  onPayment,
  plan,
  promoDiscount
}) => {
  const [isProcessing, setIsProcessing] = useState(false)
  const { settings } = useAppSettings()

  // Проверяем, что settings загружены
  if (!settings) {
    return null
  }

  const amount = plan === 'basic' ? settings.basicPlanPrice : settings.premiumPlanPrice
  const finalAmount = Math.round(amount * (1 - promoDiscount / 100))

  const handlePayment = async () => {
    setIsProcessing(true)
    try {
      await onPayment()
    } finally {
      setIsProcessing(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X size={24} />
        </button>

        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Оплата через Fondy
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

        <div className="mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center space-x-3">
            <Globe size={24} className="text-blue-600" />
            <div className="text-left">
              <div className="font-medium text-blue-900">Fondy</div>
              <div className="text-sm text-blue-700">Банківські карти, Google Pay, Apple Pay</div>
            </div>
          </div>
        </div>

        <button
          onClick={handlePayment}
          disabled={isProcessing}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isProcessing ? 'Обробка...' : `Оплатити ${finalAmount} грн`}
        </button>

        <p className="text-xs text-gray-500 text-center mt-4">
          Оплата обробляється безпечно через Fondy
        </p>
      </div>
    </div>
  )
} 