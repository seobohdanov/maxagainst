'use client'

import React from 'react'
import { X, CheckCircle, Download, Share2, Music } from 'lucide-react'

interface SuccessModalProps {
  isOpen: boolean
  onClose: () => void
  greetingData: {
    recipientName: string
    occasion: string
    musicUrl?: string
    coverUrl?: string
  }
}

export const SuccessModal: React.FC<SuccessModalProps> = ({
  isOpen,
  onClose,
  greetingData
}) => {
  const handleDownload = () => {
    if (greetingData.musicUrl) {
      const link = document.createElement('a')
      link.href = greetingData.musicUrl
      link.download = `greeting-${greetingData.recipientName}.mp3`
      link.click()
    }
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Привітання для ${greetingData.recipientName}`,
        text: `Спеціальне привітання для ${greetingData.occasion}`,
        url: window.location.href
      })
    } else {
      navigator.clipboard.writeText(window.location.href)
      alert('Посилання скопійовано в буфер обміну!')
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
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Привітання створено!
          </h2>
          <p className="text-gray-600">
            Ваше персональне привітання для {greetingData.recipientName} готове
          </p>
        </div>

        {greetingData.musicUrl && (
          <div className="mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-3">
                <Music size={20} className="text-blue-600" />
                <span className="font-medium text-gray-900">Ваше привітання</span>
              </div>
              <audio controls className="w-full">
                <source src={greetingData.musicUrl} type="audio/mpeg" />
                Ваш браузер не підтримує аудіо елемент.
              </audio>
            </div>
          </div>
        )}

        <div className="space-y-3 mb-6">
          <button
            onClick={handleDownload}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all flex items-center justify-center space-x-2"
          >
            <Download size={20} />
            <span>Завантажити</span>
          </button>

          <button
            onClick={handleShare}
            className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-200 transition-all flex items-center justify-center space-x-2"
          >
            <Share2 size={20} />
            <span>Поділитися</span>
          </button>
        </div>

        <div className="text-center">
          <button
            onClick={onClose}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Створити ще одне привітання
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center mt-4">
          Привітання збережено в вашому особистому кабінеті
        </p>
      </div>
    </div>
  )
} 