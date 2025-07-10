'use client'

import React, { useState, useEffect } from 'react'
import { Session } from 'next-auth'
import { Greeting } from '@/types'
import { Play, Pause, Download, Heart, User, Calendar, Music, ChevronDown, ChevronUp, Globe, Music2, Heart as HeartIcon, Copy, Star, Sparkles } from 'lucide-react'
import Header from '@/components/Header'
import AuthModal from '@/components/modals/AuthModal'
import { useBrowserLanguage } from '@/hooks/useBrowserLanguage'

interface ExamplesPageProps {
  session: Session | null
  onBack: () => void
  onCreateClick: () => void
  onLoginClick?: () => void
  onSignOut?: () => void
  onDashboardClick?: () => void
  onCreateFromExample?: (exampleData: {
    recipientName: string
    occasion: string
    relationship: string
    musicStyle: string
    mood: string
    greetingLanguage: string
  }) => void
}

export const ExamplesPage: React.FC<ExamplesPageProps> = ({
  session,
  onBack,
  onCreateClick,
  onLoginClick,
  onSignOut,
  onDashboardClick,
  onCreateFromExample
}) => {
  const [publicGreetings, setPublicGreetings] = useState<Greeting[]>([])
  const [loading, setLoading] = useState(true)
  const [playingGreeting, setPlayingGreeting] = useState<string | null>(null)
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null)
  const [expandedTexts, setExpandedTexts] = useState<Set<string>>(new Set())
  const [showAuthModal, setShowAuthModal] = useState(false)
  const { isRussianBrowser } = useBrowserLanguage()

  useEffect(() => {
    fetchPublicGreetings()
  }, [])

  const fetchPublicGreetings = async () => {
    try {
      const response = await fetch('/api/greetings/public')
      if (response.ok) {
        const data = await response.json()
        setPublicGreetings(data.greetings || [])
      }
    } catch (error) {
      console.error('Error fetching public greetings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePlayPause = (greetingId: string, musicUrl: string) => {
    if (playingGreeting === greetingId) {
      // Остановить воспроизведение
      if (audioRef) {
        audioRef.pause()
        audioRef.currentTime = 0
      }
      setPlayingGreeting(null)
      setAudioRef(null)
    } else {
      // Начать воспроизведение
      if (audioRef) {
        audioRef.pause()
      }
      const audio = new Audio(musicUrl)
      audio.play()
      setAudioRef(audio)
      setPlayingGreeting(greetingId)
      
      audio.onended = () => {
        setPlayingGreeting(null)
        setAudioRef(null)
      }
    }
  }

  const handleDownload = (musicUrl: string, recipientName: string) => {
    const link = document.createElement('a')
    link.href = musicUrl
    link.download = `greeting_${recipientName}_${Date.now()}.mp3`
    link.click()
  }

  const handleCreateFromExample = (greeting: Greeting) => {
    if (onCreateFromExample) {
      onCreateFromExample({
        recipientName: '', // Не предзаполняем имя
        occasion: greeting.occasion,
        relationship: greeting.relationship,
        musicStyle: greeting.musicStyle || '',
        mood: greeting.mood || '',
        greetingLanguage: greeting.greetingLanguage || 'uk'
      })
    } else {
      // Fallback к обычному созданию
      onCreateClick()
    }
  }

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return dateObj.toLocaleDateString('uk-UA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const toggleTextExpansion = (greetingId: string) => {
    setExpandedTexts(prev => {
      const newSet = new Set(prev)
      if (newSet.has(greetingId)) {
        newSet.delete(greetingId)
      } else {
        newSet.add(greetingId)
      }
      return newSet
    })
  }

  const getLanguageName = (code: string) => {
    const languages: { [key: string]: string } = {
      'uk': 'Українська',
      'en': 'English',
      'ru': 'Русский'
    }
    
    // Если браузер не русский и код языка русский, возвращаем украинский
    if (code === 'ru' && !isRussianBrowser) {
      return languages['uk'] || 'Українська'
    }
    
    return languages[code] || code
  }

  const getMoodName = (mood: string) => {
    const moods: { [key: string]: string } = {
      'веселий': 'Веселий',
      'романтичний': 'Романтичний',
      'урочистий': 'Урочистий',
      'спокійний': 'Спокійний',
      'енергійний': 'Енергійний'
    }
    return moods[mood] || mood
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-600 to-indigo-800">
      {/* Navigation */}
      <Header 
        session={session}
        showBackButton={true}
        backButtonText="Головна"
        onBackClick={onBack}
        pageTitle="🎵 Приклади привітань"
        onCreateClick={onCreateClick}
        onDashboardClick={onDashboardClick}
        onLoginClick={() => setShowAuthModal(true)}
        onSignOut={onSignOut}
        variant="minimal"
      />

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="text-center mb-16">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6">
            Приклади наших привітань
          </h1>
          <p className="text-lg sm:text-xl text-white/90 mb-8 max-w-3xl mx-auto">
            Подивіться, які чудові персональні музичні привітання створили наші користувачі
          </p>
        </div>

        {/* Examples Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white/80">Завантаження прикладів...</p>
          </div>
        ) : publicGreetings.length === 0 ? (
          <div className="text-center py-12">
            <Music className="mx-auto text-white/60 mb-4" size={64} />
            <h3 className="text-xl font-semibold text-white mb-2">Поки немає публічних привітань</h3>
            <p className="text-white/80 mb-6">Будьте першим, хто поділиться своїм привітанням!</p>
            <button 
              onClick={onCreateClick}
              className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-8 py-3 rounded-xl font-bold hover:shadow-lg transition-all flex items-center gap-2"
            >
              <Sparkles className="w-5 h-5" />
              Створити перше привітання
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            {publicGreetings.map((greeting) => (
              <div key={greeting.id} className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:transform hover:scale-105 transition-all">
                {/* Cover Art */}
                <div className="aspect-square bg-gradient-to-br from-pink-100 to-purple-100 rounded-xl overflow-hidden mb-4">
                  {greeting.coverUrl ? (
                    <img 
                      src={greeting.coverUrl} 
                      alt="Обкладинка"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Music className="text-gray-400" size={48} />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="space-y-3 mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">
                      Для: {greeting.recipientName}
                    </h3>
                    <p className="text-white/80 text-sm">{greeting.occasion}</p>
                  </div>

                  {/* Детали поздравления */}
                  <div className="space-y-2 text-xs text-white/70">
                    {greeting.musicStyle && (
                      <div className="flex items-center gap-1">
                        <Music2 size={12} />
                        <span>Стиль: {greeting.musicStyle}</span>
                      </div>
                    )}
                    {greeting.mood && (
                      <div className="flex items-center gap-1">
                        <HeartIcon size={12} />
                        <span>Настрій: {getMoodName(greeting.mood)}</span>
                      </div>
                    )}
                    {greeting.greetingLanguage && (
                      <div className="flex items-center gap-1">
                        <Globe size={12} />
                        <span>Мова: {getLanguageName(greeting.greetingLanguage)}</span>
                      </div>
                    )}
                  </div>

                  {/* Текст поздравления */}
                  {greeting.text && (
                    <div className="bg-white/5 rounded-lg p-3">
                      <div className="text-xs text-white/60 mb-2">Текст пісні:</div>
                      <div className="text-sm text-white/90 leading-relaxed">
                        {expandedTexts.has(greeting.id) ? (
                          <div className="whitespace-pre-wrap">{greeting.text}</div>
                        ) : (
                          <div>
                            {greeting.text.length > 100 
                              ? `${greeting.text.substring(0, 100)}...` 
                              : greeting.text
                            }
                          </div>
                        )}
                      </div>
                      {greeting.text.length > 100 && (
                        <button
                          onClick={() => toggleTextExpansion(greeting.id)}
                          className="text-xs text-pink-300 hover:text-pink-200 mt-2 flex items-center gap-1"
                        >
                          {expandedTexts.has(greeting.id) ? (
                            <>
                              <ChevronUp size={12} />
                              Згорнути
                            </>
                          ) : (
                            <>
                              <ChevronDown size={12} />
                              Розгорнути
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-sm text-white/60">
                    <Calendar size={16} />
                    <span>{formatDate(greeting.createdAt)}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${
                      greeting.plan === 'premium' 
                        ? 'bg-yellow-100 text-yellow-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {greeting.plan === 'premium' ? (
                        <>
                          <Star className="w-3 h-3" />
                          Premium
                        </>
                      ) : (
                        <>
                          <Music className="w-3 h-3" />
                          Basic
                        </>
                      )}
                    </span>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex gap-2">
                  <button 
                    onClick={() => handlePlayPause(greeting.id, greeting.musicUrl || '')}
                    className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 text-white py-2 px-3 rounded-lg text-sm hover:shadow-lg transition-all flex items-center justify-center gap-1"
                  >
                    {playingGreeting === greeting.id ? (
                      <>
                        <Pause size={16} />
                        Пауза
                      </>
                    ) : (
                      <>
                        <Play size={16} />
                        Слухати
                      </>
                    )}
                  </button>
                  <button 
                    onClick={() => handleDownload(greeting.musicUrl || '', greeting.recipientName)}
                    className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    title="Скачати"
                  >
                    <Download size={16} />
                  </button>
                </div>
                
                {/* Template Button */}
                <button 
                  onClick={() => handleCreateFromExample(greeting)}
                  className="w-full mt-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-2 px-4 rounded-lg text-sm hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <Copy size={16} />
                  Використати як шаблон
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Call to Action */}
        <div className="text-center bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
          <h2 className="text-3xl font-bold text-white mb-4">Готові створити своє привітання?</h2>
          <p className="text-white/90 mb-8 max-w-2xl mx-auto">
            Кожне привітання унікальне та створюється спеціально для вас. 
            Почніть зараз і подаруйте незабутні емоції своїм близьким!
          </p>
          <button 
            onClick={onCreateClick}
            className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-12 py-4 rounded-xl text-xl font-bold hover:shadow-2xl transform hover:scale-105 transition-all flex items-center gap-3"
          >
            <Sparkles className="w-6 h-6" />
            Створити привітання
          </button>
        </div>
      </div>

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal 
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
        />
      )}
    </div>
  )
} 