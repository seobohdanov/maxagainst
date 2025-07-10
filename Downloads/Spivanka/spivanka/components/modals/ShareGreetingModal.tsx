'use client'

import React, { useState } from 'react'
import { X, Share2, Lock, Globe, Heart } from 'lucide-react'

interface ShareGreetingModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (allowSharing: boolean) => void
  recipientName: string
}

export const ShareGreetingModal: React.FC<ShareGreetingModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  recipientName
}) => {
  const [allowSharing, setAllowSharing] = useState(false)

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
          <div className="w-16 h-16 bg-gradient-to-br from-pink-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Share2 className="text-pink-600" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Поділитися привітанням?
          </h2>
          <p className="text-gray-600">
            Ваше привітання для <span className="font-semibold">{recipientName}</span> готове!
          </p>
        </div>

        <div className="space-y-4 mb-6">
          <div 
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
              allowSharing 
                ? 'border-pink-500 bg-pink-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => setAllowSharing(true)}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                allowSharing ? 'bg-pink-500 text-white' : 'bg-gray-100 text-gray-600'
              }`}>
                <Globe size={20} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">Зробити публічним</h3>
                <p className="text-sm text-gray-600">
                  Інші користувачі зможуть бачити та слухати ваше привітання
                </p>
              </div>
            </div>
          </div>

          <div 
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
              !allowSharing 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => setAllowSharing(false)}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                !allowSharing ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'
              }`}>
                <Lock size={20} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">Залишити приватним</h3>
                <p className="text-sm text-gray-600">
                  Тільки ви зможете бачити та слухати це привітання
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
          >
            Скасувати
          </button>
          <button
            onClick={() => onConfirm(allowSharing)}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
          >
            Продовжити
          </button>
        </div>

        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <div className="flex items-start gap-2">
            <Heart className="text-blue-600 mt-0.5" size={16} />
            <p className="text-sm text-blue-800">
              Публічні привітання допомагають іншим користувачам знайти натхнення для створення власних!
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 