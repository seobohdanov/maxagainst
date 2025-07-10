'use client'

import React, { useState, useEffect } from 'react'
import { Session } from 'next-auth'
import { useRouter } from 'next/navigation'
import { signIn, signOut } from 'next-auth/react'
import LanguageSwitcher from './LanguageSwitcher'
import { useTranslation } from '@/hooks/useTranslation'
import { useAppSettings } from '@/hooks/useAppSettings'
import { Music, Sparkles, LogIn, BarChart3, ArrowRight, Menu, X } from 'lucide-react'

interface HeaderProps {
  session: Session | null
  onLoginClick?: () => void
  onSignOut?: () => void
  onCreateClick?: () => void
  onExamplesClick?: () => void
  onDashboardClick?: () => void
  hasActiveGeneration?: boolean
  onActiveGenerationClick?: () => void
  onClearGenerationClick?: () => void
  showBackButton?: boolean
  backButtonText?: string
  onBackClick?: () => void
  pageTitle?: string
  variant?: 'default' | 'minimal' | 'admin' | 'light'
  className?: string
}

// Вспомогательный компонент для аватара
const UserAvatar = ({ name, image }: { name?: string; image?: string }) => {
  if (image) {
    return <img src={image} alt={name || ''} className="w-8 h-8 lg:w-10 lg:h-10 rounded-full border-2 border-white/30 object-cover" />
  }
  const initial = name ? name[0].toUpperCase() : '?'
  return (
    <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-gradient-to-br from-pink-400 to-purple-600 flex items-center justify-center text-white font-bold text-sm lg:text-xl border-2 border-white/30 shadow-md">
      {initial}
    </div>
  )
}

export const Header: React.FC<HeaderProps> = ({
  session,
  onLoginClick,
  onSignOut,
  onCreateClick,
  onExamplesClick,
  onDashboardClick,
  hasActiveGeneration,
  onActiveGenerationClick,
  onClearGenerationClick,
  showBackButton = false,
  backButtonText = 'Назад',
  onBackClick,
  pageTitle,
  variant = 'default',
  className = ''
}) => {
  const { t } = useTranslation()
  const router = useRouter()
  const { settings, isSettingsLoading } = useAppSettings()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Закрытие мобильного меню при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isMobileMenuOpen) {
        const target = event.target as Element
        if (!target.closest('nav')) {
          setIsMobileMenuOpen(false)
        }
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [isMobileMenuOpen])

  // Обработчики по умолчанию
  const handleLoginClick = onLoginClick || (async () => {
    // Используем NextAuth signIn для корректного входа
    await signIn('google', { callbackUrl: '/dashboard' })
  })
  const handleSignOut = onSignOut || (async () => {
    // Используем NextAuth signOut для корректного выхода
    await signOut({ callbackUrl: '/' })
  })
  const handleCreateClick = onCreateClick || (() => router.push('/'))
  const handleExamplesClick = onExamplesClick || (() => router.push('/examples'))
  const handleDashboardClick = onDashboardClick || (() => router.push('/dashboard'))
  const handleBackClick = onBackClick || (() => router.back())

  // Стили для разных вариантов
  const getVariantStyles = () => {
    switch (variant) {
      case 'minimal':
        return 'bg-white/5 backdrop-blur-sm border-b border-white/10'
      case 'admin':
        return 'bg-white shadow-sm border-b border-gray-200'
      case 'light':
        return 'bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm'
      default:
        return 'bg-gradient-to-r from-purple-900/95 to-indigo-800/95 backdrop-blur-md border-b border-white/10'
    }
  }

  const getTextStyles = () => {
    switch (variant) {
      case 'admin':
      case 'light':
        return 'text-gray-900'
      default:
        return 'text-white'
    }
  }

  const getButtonStyles = () => {
    switch (variant) {
      case 'admin':
      case 'light':
        return 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
      default:
        return 'text-white/90 hover:text-white hover:bg-white/10'
    }
  }

  return (
    <nav className={`relative z-50 ${getVariantStyles()} ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16 lg:h-20">
          {/* Левая секция */}
          <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
            {/* Кнопка назад */}
            {showBackButton && (
              <button 
                onClick={handleBackClick}
                className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-2 rounded-lg font-medium transition-all text-sm sm:text-base ${getButtonStyles()}`}
              >
                <span>←</span>
                <span className="hidden sm:inline">{backButtonText}</span>
              </button>
            )}

            {/* Логотип */}
            <div className="flex items-center min-w-0">
              <div className="flex-shrink-0">
                {isSettingsLoading ? (
                  // Показываем placeholder во время загрузки
                  <div className={`h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 animate-pulse rounded-full ${
                    variant === 'admin' || variant === 'light' ? 'bg-gray-200' : 'bg-white/20'
                  }`}></div>
                ) : settings?.appLogo ? (
                  <img 
                    src={settings.appLogo} 
                    alt={settings.appName || 'Spivanka'} 
                    className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 object-contain"
                  />
                ) : (
                  <span className={`text-lg sm:text-xl lg:text-2xl font-bold ${getTextStyles()} flex items-center`}>
                    <Music className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8" />
                    <span className="ml-1 sm:ml-2 hidden xs:inline text-sm sm:text-base lg:text-xl">Spivanka</span>
                  </span>
                )}
              </div>
              
              {/* Заголовок страницы */}
              {pageTitle && (
                <div className="ml-2 sm:ml-4 hidden md:block min-w-0">
                  <h1 className={`text-sm sm:text-base lg:text-lg font-semibold ${getTextStyles()} truncate`}>{pageTitle}</h1>
                </div>
              )}
            </div>
          </div>

          {/* Десктопная навигация */}
          <div className="hidden lg:flex items-center space-x-6">
            {/* Переключатель языков */}
            <LanguageSwitcher variant={variant === 'admin' || variant === 'light' ? 'light' : 'dark'} />
            
            {/* Навигационные кнопки */}
            {onExamplesClick && (
              <button 
                onClick={handleExamplesClick}
                className={`transition-colors text-sm font-medium flex items-center gap-2 px-3 py-2 rounded-lg ${getButtonStyles()}`}
              >
                <Music className="w-4 h-4" />
                <span>{t('landing.examples')}</span>
              </button>
            )}

            {/* Активная генерация */}
            {hasActiveGeneration && onActiveGenerationClick && (
              <button 
                onClick={onActiveGenerationClick}
                className="bg-gradient-to-r from-yellow-500 to-orange-600 text-white px-4 py-2 rounded-full font-semibold hover:shadow-lg transition-all text-sm flex items-center gap-2 animate-pulse"
              >
                <Music className="w-4 h-4" />
                <span>Генерація в процесі</span>
              </button>
            )}

            {/* Секция пользователя */}
            {session ? (
              <div className="flex items-center space-x-4">
                {onDashboardClick && (
                  <button 
                    onClick={handleDashboardClick}
                    className={`transition-colors text-sm font-medium flex items-center gap-2 px-3 py-2 rounded-lg ${getButtonStyles()}`}
                  >
                    <BarChart3 className="w-4 h-4" />
                    <span>{t('landing.dashboard')}</span>
                  </button>
                )}
                
                <div className="flex items-center space-x-3">
                  <UserAvatar name={session.user?.name || undefined} image={session.user?.image || undefined} />
                  <span className={`font-medium text-sm ${getTextStyles()}`}>
                    {session.user?.name?.split(' ')[0]}
                  </span>
                  <button 
                    onClick={handleSignOut}
                    className={`transition-colors text-xs px-2 py-1 rounded ${getButtonStyles()}`}
                  >
                    {t('landing.logout')}
                  </button>
                </div>
              </div>
            ) : (
              <button 
                onClick={handleLoginClick}
                className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                  variant === 'admin' || variant === 'light'
                    ? 'bg-purple-600 text-white hover:bg-purple-700' 
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                {/* Google SVG logo */}
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <g>
                    <path d="M19.6 10.23c0-.68-.06-1.36-.18-2H10v3.79h5.48a4.68 4.68 0 01-2.03 3.07v2.55h3.28c1.92-1.77 3.03-4.38 3.03-7.41z" fill="#4285F4"/>
                    <path d="M10 20c2.7 0 4.97-.9 6.63-2.44l-3.28-2.55c-.91.61-2.07.97-3.35.97-2.57 0-4.75-1.74-5.53-4.07H1.09v2.6A10 10 0 0010 20z" fill="#34A853"/>
                    <path d="M4.47 11.91A5.99 5.99 0 014.1 10c0-.66.11-1.31.3-1.91V5.49H1.09A10 10 0 000 10c0 1.64.39 3.19 1.09 4.51l3.38-2.6z" fill="#FBBC05"/>
                    <path d="M10 4.01c1.47 0 2.78.51 3.81 1.51l2.85-2.85C14.97 1.13 12.7.01 10 .01A10 10 0 001.09 5.49l3.38 2.6C5.25 5.75 7.43 4.01 10 4.01z" fill="#EA4335"/>
                  </g>
                </svg>
                <span>{t('landing.login')}</span>
              </button>
            )}

            {/* Главная кнопка */}
            {onCreateClick && (
              <button 
                onClick={handleCreateClick}
                className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-6 py-2 rounded-lg font-semibold hover:shadow-lg hover:scale-105 transition-all flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>{t('landing.createGreeting')}</span>
              </button>
            )}
          </div>

          {/* Мобильное меню - кнопка */}
          <div className="lg:hidden flex-shrink-0">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`transition-colors p-1 sm:p-2 ${getButtonStyles()}`}
              aria-label="Toggle mobile menu"
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              ) : (
                <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Мобильное меню */}
        {isMobileMenuOpen && (
          <div className="lg:hidden">
            <div className={`absolute top-full left-0 right-0 backdrop-blur-xl border-b shadow-2xl ${
              variant === 'admin' || variant === 'light'
                ? 'bg-white border-gray-200' 
                : 'bg-gradient-to-br from-purple-900 to-indigo-900 border-white/10'
            }`}>
              <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
                {/* Верхняя секция */}
                <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
                  {/* Переключатель языков */}
                  <div className="flex justify-center">
                    <LanguageSwitcher variant={variant === 'admin' || variant === 'light' ? 'light' : 'dark'} />
                  </div>
                  
                  {/* Навигационные ссылки */}
                  <div className="grid grid-cols-1 gap-2">
                    {onExamplesClick && (
                      <button 
                        onClick={() => { handleExamplesClick(); setIsMobileMenuOpen(false); }} 
                        className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl transition-all text-sm sm:text-base font-medium border ${
                          variant === 'admin' || variant === 'light'
                            ? 'text-gray-700 hover:text-gray-900 hover:bg-gray-50 border-gray-200 hover:border-gray-300'
                            : 'text-white/90 hover:text-white hover:bg-white/10 border-white/5 hover:border-white/20'
                        }`}
                      >
                        <Music className="w-5 h-5 sm:w-6 sm:h-6" />
                        <span className="flex-1 text-left">{t('landing.examples')}</span>
                        <ArrowRight className={`w-4 h-4 ${variant === 'admin' || variant === 'light' ? 'text-gray-400' : 'text-white/50'}`} />
                      </button>
                    )}
                    
                    {hasActiveGeneration && onActiveGenerationClick && (
                      <button 
                        onClick={() => { onActiveGenerationClick(); setIsMobileMenuOpen(false); }} 
                        className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl bg-gradient-to-r from-yellow-500 to-orange-600 text-white font-semibold text-sm sm:text-base animate-pulse border border-yellow-400/30"
                      >
                        <Music className="w-5 h-5 sm:w-6 sm:h-6" />
                        <span className="flex-1 text-left">Генерація в процесі</span>
                        <Sparkles className="w-4 h-4" />
                      </button>
                    )}
                    
                    {session && onDashboardClick && (
                      <button 
                        onClick={() => { handleDashboardClick(); setIsMobileMenuOpen(false); }} 
                        className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl transition-all text-sm sm:text-base font-medium border ${
                          variant === 'admin' || variant === 'light'
                            ? 'text-gray-700 hover:text-gray-900 hover:bg-gray-50 border-gray-200 hover:border-gray-300'
                            : 'text-white/90 hover:text-white hover:bg-white/10 border-white/5 hover:border-white/20'
                        }`}
                      >
                        <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6" />
                        <span className="flex-1 text-left">{t('landing.dashboard')}</span>
                        <ArrowRight className={`w-4 h-4 ${variant === 'admin' || variant === 'light' ? 'text-gray-400' : 'text-white/50'}`} />
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Разделитель */}
                <div className={`border-t my-4 sm:my-6 ${variant === 'admin' || variant === 'light' ? 'border-gray-200' : 'border-white/10'}`}></div>
                
                {/* Нижняя секция */}
                <div className="space-y-3 sm:space-y-4">
                  {/* Секция пользователя */}
                  {session ? (
                    <div className={`flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl border ${
                      variant === 'admin' || variant === 'light'
                        ? 'bg-gray-50 border-gray-200'
                        : 'bg-white/5 border-white/10'
                    }`}>
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                        <div className="flex-shrink-0">
                          <UserAvatar name={session.user?.name || undefined} image={session.user?.image || undefined} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className={`font-medium text-sm sm:text-base ${getTextStyles()} truncate`}>{session.user?.name?.split(' ')[0]}</div>
                          <div className={`text-xs sm:text-sm ${variant === 'admin' || variant === 'light' ? 'text-gray-500' : 'text-white/60'} truncate`}>{session.user?.email}</div>
                        </div>
                      </div>
                      <button 
                        onClick={() => { handleSignOut(); setIsMobileMenuOpen(false); }} 
                        className={`transition-colors text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2 rounded-md sm:rounded-lg border flex-shrink-0 ${
                          variant === 'admin' || variant === 'light'
                            ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 border-gray-200'
                            : 'text-white/70 hover:text-white hover:bg-white/10 border-white/10'
                        }`}
                      >
                        {t('landing.logout')}
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => { handleLoginClick(); setIsMobileMenuOpen(false); }} 
                      className={`w-full flex items-center justify-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl font-medium transition-all text-sm sm:text-base border ${
                        variant === 'admin' || variant === 'light'
                          ? 'bg-purple-600 text-white hover:bg-purple-700 border-purple-600'
                          : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                      }`}
                    >
                      <LogIn className="w-5 h-5 sm:w-6 sm:h-6" />
                      <span>{t('landing.login')}</span>
                    </button>
                  )}
                  
                  {/* Главная кнопка */}
                  {onCreateClick && (
                    <button 
                      onClick={() => { handleCreateClick(); setIsMobileMenuOpen(false); }} 
                      className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-3 sm:py-4 rounded-lg sm:rounded-xl text-base sm:text-lg font-bold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 sm:gap-3 border border-pink-400/30"
                    >
                      <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
                      <span>{t('landing.createGreeting')}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}

export default Header 