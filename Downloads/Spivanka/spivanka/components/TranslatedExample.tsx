'use client'

import { useTranslation } from '@/hooks/useTranslation'
import LanguageSwitcher from './LanguageSwitcher'

export default function TranslatedExample() {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-600 to-indigo-800 flex items-center justify-center">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            {t('landing.title')}
          </h1>
          <p className="text-xl text-white/90 mb-8">
            {t('landing.subtitle')}
          </p>
          
          {/* Переключатель языков */}
          <div className="flex justify-center mb-8">
            <LanguageSwitcher />
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 text-center">
            <div className="text-3xl mb-4">🎵</div>
            <h3 className="text-lg font-semibold text-white mb-2">
              {t('landing.features.personalized')}
            </h3>
            <p className="text-white/80">
              {t('landing.features.personalized')}
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 text-center">
            <div className="text-3xl mb-4">🤖</div>
            <h3 className="text-lg font-semibold text-white mb-2">
              {t('landing.features.ai')}
            </h3>
            <p className="text-white/80">
              {t('landing.features.ai')}
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 text-center">
            <div className="text-3xl mb-4">✨</div>
            <h3 className="text-lg font-semibold text-white mb-2">
              {t('landing.features.easy')}
            </h3>
            <p className="text-white/80">
              {t('landing.features.easy')}
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 text-center">
            <div className="text-3xl mb-4">⭐</div>
            <h3 className="text-lg font-semibold text-white mb-2">
              {t('landing.features.quality')}
            </h3>
            <p className="text-white/80">
              {t('landing.features.quality')}
            </p>
          </div>
        </div>

        <div className="text-center mt-8">
          <button className="bg-white text-purple-900 px-8 py-3 rounded-lg font-semibold hover:bg-white/90 transition-colors">
            {t('landing.cta')}
          </button>
        </div>

        {/* Пример с параметрами */}
        <div className="mt-12 text-center">
          <p className="text-white/80">
            {t('messages.greetingCreated')} - {t('common.success')}
          </p>
          <p className="text-white/80 mt-2">
            {t('errors.network')} - {t('common.error')}
          </p>
        </div>
      </div>
    </div>
  )
} 