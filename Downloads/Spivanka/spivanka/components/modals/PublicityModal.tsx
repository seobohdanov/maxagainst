'use client'

import React from 'react'
import { X, Share2, Heart, Users } from 'lucide-react'

interface PublicityModalProps {
  isOpen: boolean
  onClose: () => void
  onAllow: () => void
  onDecline: () => void
}

export const PublicityModal: React.FC<PublicityModalProps> = ({
  isOpen,
  onClose,
  onAllow,
  onDecline
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 animate-in zoom-in-95 duration-300">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={24} />
        </button>
        
        {/* Content */}
        <div className="text-center">
          {/* Icon */}
          <div className="w-20 h-20 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Share2 className="w-10 h-10 text-white" />
          </div>
          
          {/* Title */}
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Поділитися привітанням?
          </h2>
          
          {/* Description */}
          <p className="text-gray-600 mb-8 leading-relaxed">
            Ваше привітання може надихнути інших людей! Дозволити додати його до публічних прикладів?
          </p>
          
          {/* Benefits */}
          <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl p-6 mb-8">
            <div className="flex items-center gap-3 mb-3">
              <Heart className="w-5 h-5 text-pink-500" />
              <span className="text-sm font-medium text-gray-700">Допоможе іншим створити красиві привітання</span>
            </div>
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-purple-500" />
              <span className="text-sm font-medium text-gray-700">Ваше ім'я буде вказано як автора</span>
            </div>
          </div>
          
          {/* Buttons */}
          <div className="flex gap-4">
            <button
              onClick={onDecline}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
            >
              Ні, дякую
            </button>
            <button
              onClick={onAllow}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition-all"
            >
              Так, поділитися
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 