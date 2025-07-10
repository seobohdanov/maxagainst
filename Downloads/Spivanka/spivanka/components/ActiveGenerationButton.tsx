'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Music, Loader2 } from 'lucide-react'
import { getActiveGeneration } from '@/lib/localStorage'

export const ActiveGenerationButton: React.FC = () => {
  const [activeGeneration, setActiveGeneration] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const checkActiveGeneration = () => {
      const generation = getActiveGeneration()
      
      // Проверяем, есть ли активная генерация в localStorage
      if (generation) {
        // Дополнительно проверяем состояние генерации
        try {
          const generationState = localStorage.getItem('generationState')
          if (generationState) {
            const state = JSON.parse(generationState)
            // Показываем кнопку только если генерация не завершена
            if (state.taskId === generation && state.musicGenerationStep !== 'complete') {
              setActiveGeneration(generation)
              return
            }
          }
        } catch (error) {
          console.error('Помилка перевірки стану генерації:', error)
        }
      }
      
      // Если генерация завершена или нет активной генерации, скрываем кнопку
      setActiveGeneration(null)
    }

    checkActiveGeneration()
    
    // Проверяем каждые 5 секунд
    const interval = setInterval(checkActiveGeneration, 5000)
    
    return () => clearInterval(interval)
  }, [])

  const handleClick = () => {
    if (!activeGeneration) return
    
    setIsLoading(true)
    router.push(`/greeting/${activeGeneration}`)
  }

  if (!activeGeneration) {
    return null
  }

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className="fixed top-4 left-4 z-50 bg-gradient-to-r from-pink-500 to-purple-600 text-white px-4 py-2 rounded-full font-medium hover:shadow-lg transition-all flex items-center gap-2 shadow-lg"
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Music className="w-4 h-4" />
      )}
      <span className="hidden sm:inline">Генерація в процесі</span>
      <span className="sm:hidden">🎵</span>
    </button>
  )
} 