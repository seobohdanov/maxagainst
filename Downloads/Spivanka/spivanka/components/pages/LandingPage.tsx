'use client'

import React, { useState, useEffect } from 'react'
import { Session } from 'next-auth'
import Header from '@/components/Header'
import { useTranslation } from '@/hooks/useTranslation'

interface Settings {
  appName: string
  appLogo: string
  basicPlanPrice: number
  premiumPlanPrice: number
  maintenanceMode: boolean
}

interface TextBlock {
  _id: string
  key: string
  title: string
  description: string
  icon: string
  order: number
  isActive: boolean
}

interface LandingPageProps {
  session: Session | null
  onCreateClick: () => void
  onLoginClick: () => void
  onSignOut: () => void
  onExamplesClick: () => void
  onDashboardClick: () => void
  onClearGenerationClick?: () => void
  hasActiveGeneration?: boolean
  onActiveGenerationClick?: () => void
}



export const LandingPage: React.FC<LandingPageProps> = ({
  session,
  onCreateClick,
  onLoginClick,
  onSignOut,
  onExamplesClick,
  onDashboardClick,
  onClearGenerationClick,
  hasActiveGeneration,
  onActiveGenerationClick
}) => {
  const { t } = useTranslation()
  const [isClient, setIsClient] = useState(false)
  const [settings, setSettings] = useState<Settings | null>(null)
  const [isLoadingSettings, setIsLoadingSettings] = useState(true)
  const [textBlocks, setTextBlocks] = useState<TextBlock[]>([])
  const [isLoadingTextBlocks, setIsLoadingTextBlocks] = useState(true)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Загружаем настройки из админки
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/admin/settings')
        if (response.ok) {
                  const data = await response.json()
        // API возвращает данные напрямую, а не в data.settings
        if (data.basicPlanPrice && data.premiumPlanPrice) {
          setSettings(data)
        } else {
          console.warn('⚠️ Настройки не содержат цены:', data)
        }
        }
      } catch (error) {
        console.error('Ошибка загрузки настроек:', error)
      } finally {
        setIsLoadingSettings(false)
      }
    }

    loadSettings()
  }, [])

  // Загружаем текстовые блоки
  useEffect(() => {
    const loadTextBlocks = async () => {
      try {
        const response = await fetch('/api/text-blocks')
        if (response.ok) {
          const data = await response.json()
          setTextBlocks(data)
        } else {
          console.error('Ошибка загрузки текстовых блоков:', response.status)
        }
      } catch (error) {
        console.error('Ошибка загрузки текстовых блоков:', error)
      } finally {
        setIsLoadingTextBlocks(false)
      }
    }

    loadTextBlocks()
  }, [])

  // CSS animations
  const fadeInUp = "animate-[fadeInUp_0.6s_ease-out]"
  const fadeIn = "animate-[fadeIn_0.8s_ease-out]"
  const slideInLeft = "animate-[slideInLeft_0.5s_ease-out]"
  const slideInRight = "animate-[slideInRight_0.5s_ease-out]"
  const pulse = "animate-[pulse_2s_ease-in-out_infinite]"

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-600 to-indigo-800">
      {/* Navigation */}
      <Header 
        session={session}
        onLoginClick={onLoginClick}
        onSignOut={onSignOut}
        onCreateClick={onCreateClick}
        onExamplesClick={onExamplesClick}
        onDashboardClick={onDashboardClick}
        hasActiveGeneration={hasActiveGeneration}
        onActiveGenerationClick={onActiveGenerationClick}
        onClearGenerationClick={onClearGenerationClick}
        className={fadeIn}
      />

      {/* Hero Section */}
      <div className={`max-w-6xl mx-auto px-6 py-20 ${fadeInUp}`}>
        <div className="text-center mb-16">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 px-4">
            {t('landing.title')}
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl text-white/90 mb-12 max-w-3xl mx-auto px-4">
            {t('landing.subtitle')}
          </p>
          <button 
            onClick={onCreateClick}
            className={`bg-gradient-to-r from-pink-500 to-purple-600 text-white px-12 py-4 rounded-xl text-xl font-bold hover:shadow-2xl transform hover:scale-105 transition-all ${pulse}`}
          >
            {t('landing.createGreeting')}
          </button>
        </div>

        {/* Features */}
        <div className={`grid md:grid-cols-3 gap-8 mb-16 ${slideInLeft}`}>
          {isLoadingTextBlocks ? (
            // Показываем заглушки во время загрузки
            <>
              <div className="bg-gradient-to-br from-white/15 to-pink-500/10 backdrop-blur-md rounded-2xl p-8 text-center border border-white/20">
                <div className="text-5xl mb-4">🎼</div>
                <div className="animate-pulse">
                  <div className="h-8 bg-white/20 rounded mb-4"></div>
                  <div className="h-4 bg-white/20 rounded"></div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-white/15 to-purple-500/10 backdrop-blur-md rounded-2xl p-8 text-center border border-white/20">
                <div className="text-5xl mb-4">✍️</div>
                <div className="animate-pulse">
                  <div className="h-8 bg-white/20 rounded mb-4"></div>
                  <div className="h-4 bg-white/20 rounded"></div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-white/15 to-indigo-500/10 backdrop-blur-md rounded-2xl p-8 text-center border border-white/20">
                <div className="text-5xl mb-4">🎨</div>
                <div className="animate-pulse">
                  <div className="h-8 bg-white/20 rounded mb-4"></div>
                  <div className="h-4 bg-white/20 rounded"></div>
                </div>
              </div>
            </>
          ) : textBlocks.length > 0 ? (
            // Отображаем динамические блоки
            textBlocks.map((block) => (
              <div key={block._id} className="bg-gradient-to-br from-white/15 to-pink-500/10 backdrop-blur-md rounded-2xl p-8 text-center border border-white/20 hover:transform hover:scale-105 transition-all">
                <div className="text-5xl mb-4">{block.icon}</div>
                <h3 className="text-2xl font-bold text-white mb-4">{block.title}</h3>
                <p className="text-white/90">
                  {block.description}
                </p>
              </div>
            ))
          ) : (
            // Fallback к статичным блокам, если нет данных
            <>
              <div className="bg-gradient-to-br from-white/15 to-pink-500/10 backdrop-blur-md rounded-2xl p-8 text-center border border-white/20 hover:transform hover:scale-105 transition-all">
                <div className="text-5xl mb-4">🎼</div>
                <h3 className="text-2xl font-bold text-white mb-4">{t('landing.featureBlocks.uniqueMusic.title')}</h3>
                <p className="text-white/90">
                  {t('landing.featureBlocks.uniqueMusic.description')}
                </p>
              </div>
              <div className="bg-gradient-to-br from-white/15 to-purple-500/10 backdrop-blur-md rounded-2xl p-8 text-center border border-white/20 hover:transform hover:scale-105 transition-all">
                <div className="text-5xl mb-4">✍️</div>
                <h3 className="text-2xl font-bold text-white mb-4">{t('landing.featureBlocks.personalText.title')}</h3>
                <p className="text-white/90">
                  {t('landing.featureBlocks.personalText.description')}
                </p>
              </div>
              <div className="bg-gradient-to-br from-white/15 to-indigo-500/10 backdrop-blur-md rounded-2xl p-8 text-center border border-white/20 hover:transform hover:scale-105 transition-all">
                <div className="text-5xl mb-4">🎨</div>
                <h3 className="text-2xl font-bold text-white mb-4">{t('landing.featureBlocks.beautifulCover.title')}</h3>
                <p className="text-white/90">
                  {t('landing.featureBlocks.beautifulCover.description')}
                </p>
              </div>
            </>
          )}
        </div>

        {/* How it works */}
        <div className={`text-center ${slideInRight}`}>
          <h2 className="text-4xl font-bold text-white mb-12">{t('landing.howItWorks.title')}</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: 1, title: t('landing.howItWorks.step1.title'), desc: t('landing.howItWorks.step1.desc') },
              { step: 2, title: t('landing.howItWorks.step2.title'), desc: t('landing.howItWorks.step2.desc') },
              { step: 3, title: t('landing.howItWorks.step3.title'), desc: t('landing.howItWorks.step3.desc') },
              { step: 4, title: t('landing.howItWorks.step4.title'), desc: t('landing.howItWorks.step4.desc') }
            ].map(item => (
              <div key={item.step} className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto mb-4 shadow-lg">
                  {item.step}
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                <p className="text-white/80">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing */}
        <div className="mt-20 text-center">
          <h2 className="text-4xl font-bold text-white mb-12">{t('landing.pricing.title')}</h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
              <h3 className="text-2xl font-bold text-white mb-4">{t('landing.pricing.basic.title')}</h3>
              <div className="text-4xl font-bold text-white mb-6">
                {isLoadingSettings ? (
                  <div className="animate-pulse bg-white/20 h-12 w-24 mx-auto rounded"></div>
                ) : (
                  `${settings?.basicPlanPrice || 199}₴`
                )}
              </div>
              <ul className="text-white/90 mb-8 space-y-2">
                <li>✓ {t('landing.pricing.basic.features.0')}</li>
                <li>✓ {t('landing.pricing.basic.features.1')}</li>
                <li>✓ {t('landing.pricing.basic.features.2')}</li>
                <li>✓ {t('landing.pricing.basic.features.3')}</li>
              </ul>
              <button 
                onClick={onCreateClick}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-3 rounded-xl font-bold hover:shadow-lg transition-all"
              >
                {t('landing.pricing.basic.select')}
              </button>
            </div>
            <div className="bg-gradient-to-br from-yellow-400/20 to-orange-500/20 backdrop-blur-md rounded-2xl p-8 border-2 border-yellow-400/50 relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-yellow-400 text-gray-900 px-4 py-1 rounded-full text-sm font-bold">
                {t('landing.pricing.premium.popular')}
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">{t('landing.pricing.premium.title')}</h3>
              <div className="text-4xl font-bold text-white mb-6">
                {isLoadingSettings ? (
                  <div className="animate-pulse bg-white/20 h-12 w-24 mx-auto rounded"></div>
                ) : (
                  `${settings?.premiumPlanPrice || 299}₴`
                )}
              </div>
              <ul className="text-white/90 mb-8 space-y-2">
                <li>✓ {t('landing.pricing.premium.features.0')}</li>
                <li>✓ {t('landing.pricing.premium.features.1')}</li>
                <li>✓ {t('landing.pricing.premium.features.2')}</li>
                <li>✓ {t('landing.pricing.premium.features.3')}</li>
                <li>✓ {t('landing.pricing.premium.features.4')}</li>
              </ul>
              <button 
                onClick={onCreateClick}
                className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-gray-900 py-3 rounded-xl font-bold hover:shadow-lg transition-all"
              >
                {t('landing.pricing.premium.select')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900/50 backdrop-blur-md border-t border-white/10 mt-20">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
                {settings?.appLogo && (
                  <img 
                    src={settings.appLogo} 
                    alt={settings.appName || 'Spivanka'} 
                    className="w-6 h-6 object-contain"
                  />
                )}
                <span>🎵 {settings?.appName || 'Spivanka'}</span>
              </h3>
              <p className="text-white/80 text-sm">
                Створюємо унікальні музичні привітання з персональними текстами та мелодіями.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-white mb-4">Сервіс</h4>
              <ul className="space-y-2 text-white/80 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Як це працює</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Приклади</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Ціни</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white mb-4">Підтримка</h4>
              <ul className="space-y-2 text-white/80 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">FAQ</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Контакти</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Термени використання</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white mb-4">Соцмережі</h4>
              <div className="flex space-x-4">
                <a href="#" className="text-white/80 hover:text-white transition-colors">📱</a>
                <a href="#" className="text-white/80 hover:text-white transition-colors">📧</a>
                <a href="#" className="text-white/80 hover:text-white transition-colors">🐦</a>
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 mt-8 pt-8 text-center text-white/60 text-sm">
            © 2024 {settings?.appName || 'Spivanka'}. Всі права захищені.
          </div>
        </div>
      </footer>
    </div>
  )
} 