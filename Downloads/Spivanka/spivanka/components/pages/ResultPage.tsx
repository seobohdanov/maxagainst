'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Session } from 'next-auth'
import { FormData } from '@/types'
import { 
  Play, 
  Pause, 
  Download, 
  Share2, 
  Heart, 
  ArrowLeft, 
  BarChart3,
  Music,
  User,
  Calendar,
  Star
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'

interface ResultPageProps {
  session: Session | null
  formData: FormData
  generatedText: string
  generatedMusicUrl: string
  generatedCoverUrl: string
  selectedPlan: 'basic' | 'premium' | null
  onBack: () => void
  onDashboard: () => void
  onCreateAnother: () => void
  secondMusicUrl?: string // URL второй песни
  isUpdatingMusic?: boolean // Флаг обновления музыки
  onMusicUpdate?: (newUrl: string) => void // Callback для обновления музыки
  showPublicityPrompt?: boolean // Показывать ли попап публичности
  onPublicityChoice?: (allowSharing: boolean) => void // Callback для выбора публичности
  onClosePublicityPrompt?: () => void // Callback для закрытия попапа
}

export const ResultPage: React.FC<ResultPageProps> = ({
  session,
  formData,
  generatedText,
  generatedMusicUrl,
  generatedCoverUrl,
  selectedPlan,
  onBack,
  onDashboard,
  onCreateAnother,
  secondMusicUrl,
  isUpdatingMusic,
  onMusicUpdate,
  showPublicityPrompt,
  onPublicityChoice,
  onClosePublicityPrompt
}) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isLiked, setIsLiked] = useState(false)
  const [isPlayingSecond, setIsPlayingSecond] = useState(false)
  const [currentTimeSecond, setCurrentTimeSecond] = useState(0)
  const [durationSecond, setDurationSecond] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)
  const audioRefSecond = useRef<HTMLAudioElement>(null)
  const router = useRouter();

  // Показываем попап публичности через 10 секунд после загрузки страницы
  useEffect(() => {
    if (showPublicityPrompt && onPublicityChoice && onClosePublicityPrompt) {
      const timer = setTimeout(() => {
        const allowSharing = confirm('Чи хочете ви зробити це привітання публічним? Інші користувачі зможуть його побачити в прикладах.')
        onPublicityChoice(allowSharing)
        onClosePublicityPrompt()
      }, 10000)

      return () => clearTimeout(timer)
    }
  }, [showPublicityPrompt, onPublicityChoice, onClosePublicityPrompt])

  useEffect(() => {
    // Сохраняем результат в базу, если все данные есть и статус complete
    const saveResult = async () => {
      if (selectedPlan && generatedMusicUrl && generatedCoverUrl && generatedText && formData.recipientName) {
        try {
          const taskId = (typeof window !== 'undefined' && window.location.pathname.split('/').pop()) || ''
          const response = await fetch('/api/generate/music/save-result', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              taskId,
              status: 'SUCCESS',
              musicUrl: generatedMusicUrl,
              coverUrl: generatedCoverUrl,
              secondMusicUrl,
              formData,
              text: generatedText,
              selectedPlan
            })
          })
          if (response.ok) {
            // Очищаем localStorage для taskId
            if (typeof window !== 'undefined') {
              localStorage.removeItem('generationState')
              localStorage.removeItem(`greeting_${taskId}`)
            }
            console.log('✅ Результат генерації збережено в базу')
          } else {
            console.error('❌ Помилка збереження результату генерації в базу')
          }
        } catch (error) {
          console.error('❌ Помилка збереження результату генерації:', error)
        }
      }
    }
    saveResult()
  }, [selectedPlan, generatedMusicUrl, generatedCoverUrl, generatedText, formData.recipientName])

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const handlePlayPauseSecond = () => {
    if (audioRefSecond.current) {
      if (isPlayingSecond) {
        audioRefSecond.current.pause()
      } else {
        audioRefSecond.current.play()
      }
      setIsPlayingSecond(!isPlayingSecond)
    }
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  const handleTimeUpdateSecond = () => {
    if (audioRefSecond.current) {
      setCurrentTimeSecond(audioRefSecond.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
    }
  }

  const handleLoadedMetadataSecond = () => {
    if (audioRefSecond.current) {
      setDurationSecond(audioRefSecond.current.duration)
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value)
    if (audioRef.current) {
      audioRef.current.currentTime = time
      setCurrentTime(time)
    }
  }

  const handleSeekSecond = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value)
    if (audioRefSecond.current) {
      audioRefSecond.current.currentTime = time
      setCurrentTimeSecond(time)
    }
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const handleDownload = () => {
    // Проверяем, является ли это URL для стриминга
    if (generatedMusicUrl.includes('mfile.erweima.ai') || generatedMusicUrl.includes('audiopipe.suno.ai')) {
      alert('Фінальна версія для скачування ще генерується. Можете слухати стрім.')
      return
    }
    
    // В реальном приложении здесь будет логика скачивания
    const link = document.createElement('a')
    link.href = generatedMusicUrl
    link.download = `greeting_${Date.now()}.mp3`
    link.click()
  }

  // Определяем, является ли это URL для стриминга
  const isStreamingUrl = generatedMusicUrl.includes('mfile.erweima.ai') || generatedMusicUrl.includes('audiopipe.suno.ai')

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Моє музичне привітання',
        text: 'Послухайте привітання, створене з допомогою Spivanka!',
        url: window.location.href
      })
    } else {
      // Fallback для браузеров без поддержки Web Share API
      navigator.clipboard.writeText(window.location.href)
      alert('Посилання скопійовано в буфер обміну!')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-600 to-indigo-800">
      {/* Header */}
      <Header 
        session={session}
        showBackButton={true}
        backButtonText="Головна"
        onBackClick={onBack}
        pageTitle="🎵 Ваше привітання"
        onDashboardClick={onDashboard}
        variant="minimal"
      />
      
      <div className="max-w-6xl mx-auto p-6">

        {/* Content */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-pink-500 to-purple-600 p-8 text-white text-center">
            <h2 className="text-4xl font-bold mb-4">
              🎉 Ваше привітання готове!
            </h2>
            <p className="text-xl opacity-90">
              Створено з любов'ю за допомогою штучного інтелекту
            </p>
          </div>

          <div className="p-8">
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Left Column - Music Player & Cover */}
              <div className="space-y-6">
                {/* Cover Art */}
                <div className="relative group">
                  <div className="aspect-square bg-gradient-to-br from-pink-100 to-purple-100 rounded-2xl overflow-hidden shadow-lg">
                    {generatedCoverUrl ? (
                      <img 
                        src={generatedCoverUrl} 
                        alt="Обкладинка привітання"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music size={64} className="text-gray-400" />
                      </div>
                    )}
                  </div>
                  
                  {/* Play Button Overlay */}
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      onClick={handlePlayPause}
                      className="bg-white/90 hover:bg-white text-gray-800 p-4 rounded-full shadow-lg transition-all transform hover:scale-110"
                    >
                      {isPlaying ? <Pause size={32} /> : <Play size={32} />}
                    </button>
                  </div>
                </div>

                {/* Audio Player */}
                <div className="bg-gray-50 rounded-2xl p-6">
                  <audio
                    ref={audioRef}
                    src={generatedMusicUrl}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onEnded={() => setIsPlaying(false)}
                  />
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-center text-gray-800 mb-4">
                      🎵 Перша версія
                      {isUpdatingMusic && (
                        <span className="ml-2 text-sm text-blue-600 animate-pulse">
                          (оновлюється...)
                        </span>
                      )}
                    </h3>
                    
                    {/* Play/Pause Button */}
                    <div className="flex justify-center">
                      <button
                        onClick={handlePlayPause}
                        className="bg-gradient-to-r from-pink-500 to-purple-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
                      >
                        {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                      </button>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <input
                        type="range"
                        min="0"
                        max={duration || 0}
                        value={currentTime}
                        onChange={handleSeek}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                      />
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-center gap-4">
                      <button
                        onClick={() => setIsLiked(!isLiked)}
                        className={`p-3 rounded-full transition-all ${
                          isLiked 
                            ? 'bg-red-500 text-white' 
                            : 'bg-gray-200 text-gray-600 hover:bg-red-100'
                        }`}
                      >
                        <Heart size={20} className={isLiked ? 'fill-current' : ''} />
                      </button>
                      <button
                        onClick={handleDownload}
                        className={`p-3 rounded-full transition-all ${
                          isStreamingUrl 
                            ? 'bg-yellow-500 text-white hover:bg-yellow-600' 
                            : 'bg-blue-500 text-white hover:bg-blue-600'
                        }`}
                        title={isStreamingUrl ? 'Фінальна версія ще генерується' : 'Скачати аудіо'}
                      >
                        <Download size={20} />
                      </button>
                      <button
                        onClick={handleShare}
                        className="bg-green-500 text-white p-3 rounded-full hover:bg-green-600 transition-all"
                      >
                        <Share2 size={20} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Second Audio Player */}
                {secondMusicUrl && (
                  <div className="bg-gray-50 rounded-2xl p-6">
                    <audio
                      ref={audioRefSecond}
                      src={secondMusicUrl}
                      onTimeUpdate={handleTimeUpdateSecond}
                      onLoadedMetadata={handleLoadedMetadataSecond}
                      onEnded={() => setIsPlayingSecond(false)}
                    />
                    
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-center text-gray-800 mb-4">
                        🎵 Друга версія
                      </h3>
                      
                      {/* Play/Pause Button */}
                      <div className="flex justify-center">
                        <button
                          onClick={handlePlayPauseSecond}
                          className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
                        >
                          {isPlayingSecond ? <Pause size={24} /> : <Play size={24} />}
                        </button>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-2">
                        <input
                          type="range"
                          min="0"
                          max={durationSecond || 0}
                          value={currentTimeSecond}
                          onChange={handleSeekSecond}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                        />
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>{formatTime(currentTimeSecond)}</span>
                          <span>{formatTime(durationSecond)}</span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex justify-center gap-4">
                        <button
                          onClick={() => {
                            const link = document.createElement('a')
                            link.href = secondMusicUrl
                            link.download = `greeting_second_${Date.now()}.mp3`
                            link.click()
                          }}
                          className="bg-blue-500 text-white p-3 rounded-full hover:bg-blue-600 transition-all"
                          title="Скачати другу версію"
                        >
                          <Download size={20} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column - Details & Text */}
              <div className="space-y-6">
                {/* Greeting Details */}
                <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl p-6">
                  <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Star className="text-yellow-500" size={24} />
                    Деталі привітання
                  </h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <User className="text-gray-500" size={20} />
                      <div>
                        <p className="text-sm text-gray-600">Для кого:</p>
                        <p className="font-semibold text-gray-800">{formData.recipientName}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Calendar className="text-gray-500" size={20} />
                      <div>
                        <p className="text-sm text-gray-600">Привід:</p>
                        <p className="font-semibold text-gray-800">{formData.occasion}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Music className="text-gray-500" size={20} />
                      <div>
                        <p className="text-sm text-gray-600">Стиль:</p>
                        <p className="font-semibold text-gray-800">{formData.musicStyle}</p>
                      </div>
                    </div>
                    
                    {selectedPlan && (
                      <div className="flex items-center gap-3">
                        <Star className="text-gray-500" size={20} />
                        <div>
                          <p className="text-sm text-gray-600">План:</p>
                          <p className="font-semibold text-gray-800 capitalize">{selectedPlan}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Generated Text */}
                <div className="bg-white border border-gray-200 rounded-2xl p-6">
                  <h3 className="text-2xl font-bold text-gray-800 mb-4">
                    📝 Текст привітання
                  </h3>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {generatedText || 'Текст привітання буде згенерований...'}
                    </p>
                  </div>
                </div>

                {/* Additional Features */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-4">
                    ✨ Додаткові можливості
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-white rounded-lg">
                      <div className="text-2xl mb-2">🎵</div>
                      <p className="text-sm font-semibold">Висока якість</p>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg">
                      <div className="text-2xl mb-2">🔒</div>
                      <p className="text-sm font-semibold">Безпечно</p>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg">
                      <div className="text-2xl mb-2">📱</div>
                      <p className="text-sm font-semibold">Мобільний</p>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg">
                      <div className="text-2xl mb-2">💾</div>
                      <p className="text-sm font-semibold">Збережено</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={onCreateAnother}
                className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-8 py-4 rounded-xl font-bold hover:shadow-lg transition-all transform hover:scale-105"
              >
                🎵 Створити ще одне привітання
              </button>
              
              {session && (
                <button
                  onClick={onDashboard}
                  className="bg-gray-200 text-gray-700 px-8 py-4 rounded-xl font-bold hover:bg-gray-300 transition-all"
                >
                  📊 Перейти в кабінет
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Custom CSS for slider */}
      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: linear-gradient(to right, #ec4899, #8b5cf6);
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        }
        
        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: linear-gradient(to right, #ec4899, #8b5cf6);
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        }
      `}</style>
    </div>
  )
} 