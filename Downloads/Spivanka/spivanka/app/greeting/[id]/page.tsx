'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
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
  Star,
  Upload,
  FileText,
  Settings,
  CheckCircle,
  Image,
  Plus,
  Globe,
  X,
  Clock,
  Loader2
} from 'lucide-react'
import { Session } from 'next-auth'
import { FormData, GenerationStatus } from '@/types'
import { safeToast } from '@/lib/toast'
import { PublicityModal } from '@/components/modals/PublicityModal'
import ConsentModal from '@/components/modals/ConsentModal'

export default function GreetingPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const greetingId = params.id as string

  // Состояние приветствия
  const [formData, setFormData] = useState<FormData>({} as FormData)
  const [generatedText, setGeneratedText] = useState('')
  const [generatedMusicUrl, setGeneratedMusicUrl] = useState('')
  const [secondMusicUrl, setSecondMusicUrl] = useState('')
  const [generatedCoverUrl, setGeneratedCoverUrl] = useState('')
  const [selectedPlan, setSelectedPlan] = useState<'basic' | 'premium'>('basic')
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentStatus, setCurrentStatus] = useState<GenerationStatus>('PENDING')
  const [taskId, setTaskId] = useState('')
  const [isUpdatingMusic, setIsUpdatingMusic] = useState(false)

  // Состояние плеера
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isLiked, setIsLiked] = useState(false)
  const [isPlayingSecond, setIsPlayingSecond] = useState(false)
  const [currentTimeSecond, setCurrentTimeSecond] = useState(0)
  const [durationSecond, setDurationSecond] = useState(0)
  const [showPublicityModal, setShowPublicityModal] = useState(false)
  const [hasShownPublicityPrompt, setHasShownPublicityPrompt] = useState(false)
  const [isPublic, setIsPublic] = useState(false)
  const [showConsentModal, setShowConsentModal] = useState(false)
  const [hasCheckedConsents, setHasCheckedConsents] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const audioRefSecond = useRef<HTMLAudioElement>(null)

  // Защита от повторных запросов
  const isCheckingStatus = useRef(false)
  const isWaitingForCompletion = useRef(false)
  const statusCheckInterval = useRef<NodeJS.Timeout | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const isSSEClosed = useRef(false)

  // Проверка согласий при загрузке страницы
  useEffect(() => {
    if (session?.user?.email && !hasCheckedConsents) {
      checkUserConsents(session.user.email)
    }
  }, [session, hasCheckedConsents])

  const checkUserConsents = async (email: string) => {
    try {
      const response = await fetch('/api/consent/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email })
      })

      const data = await response.json()
      
      if (data.success) {
        if (!data.hasConsents) {
          console.log('⚠️ Користувач не має згод, показую попап згод')
          setShowConsentModal(true)
        } else {
          console.log('✅ Користувач має всі необхідні згоди')
        }
      }
      
      setHasCheckedConsents(true)
    } catch (error) {
      console.error('❌ Помилка перевірки згод:', error)
      setHasCheckedConsents(true)
    }
  }

  const handleConsentModalClose = () => {
    setShowConsentModal(false)
    // Если пользователь закрыл окно согласий, перенаправляем на главную страницу
    // так как без согласий он не может использовать сервис
    window.location.href = '/'
  }

  // Основной useEffect для восстановления состояния при загрузке страницы
  useEffect(() => {
    if (!greetingId) return
    
    const restoreState = async () => {
      console.log('🔄 Початок відновлення стану для:', greetingId)
      
      // 1. Сначала проверяем localStorage
      if (typeof window !== 'undefined') {
        const savedState = localStorage.getItem('generationState')
        const savedGreetingState = localStorage.getItem(`greeting_${greetingId}`)
        console.log('🔍 Перевіряю localStorage:', savedState ? 'є дані' : 'немає даних')
        console.log('🔍 Перевіряю greeting localStorage:', savedGreetingState ? 'є дані' : 'немає даних')
        
        // Сначала проверяем специфичное состояние для этого greetingId
        if (savedGreetingState) {
          const state = JSON.parse(savedGreetingState)
          console.log('📋 Дані з greeting localStorage:', {
            taskId: state.taskId,
            currentStatus: state.currentStatus,
            hasFormData: !!state.formData?.recipientName,
            hasText: !!state.generatedText
          })
          
          if (state.taskId === greetingId) {
            console.log('✅ Відновлюю активну генерацію з greeting localStorage')
            
            // Восстанавливаем данные даже если formData неполные
            if (state.formData) {
              setFormData(state.formData)
            }
            setGeneratedText(state.generatedText || '')
            setGeneratedMusicUrl(state.generatedMusicUrl || '')
            setSecondMusicUrl(state.secondMusicUrl || '')
            setGeneratedCoverUrl(state.generatedCoverUrl || '')
            setSelectedPlan(state.selectedPlan || 'basic')
            setCurrentStatus(state.currentStatus || 'PENDING')
            setTaskId(state.taskId)
            setIsGenerating(state.currentStatus !== 'SUCCESS' && state.currentStatus !== 'FAILED' && state.currentStatus !== 'GENERATE_AUDIO_FAILED')
            
            // Если данные формы неполные, пытаемся дозагрузить из статуса генерации
            if (!state.formData?.recipientName) {
              console.log('⚠️ Дані форми неповні, дозавантажую з статусу генерації')
              setTimeout(async () => {
                try {
                  const statusResponse = await fetch(`/api/generate/music/status?taskId=${greetingId}`)
                  if (statusResponse.ok) {
                    const statusResult = await statusResponse.json()
                    if (statusResult.success && statusResult.formData) {
                      setFormData(statusResult.formData)
                      console.log('✅ Дані форми дозавантажено з статусу')
                    } else if (statusResult.param) {
                      try {
                        const paramData = JSON.parse(statusResult.param)
                        setFormData({
                          recipientName: paramData.recipientName || '',
                          occasion: paramData.occasion || '',
                          relationship: paramData.relationship || '',
                          personalDetails: paramData.personalDetails || '',
                          musicStyle: paramData.musicStyle || 'pop',
                          mood: paramData.mood || 'joyful',
                          greetingLanguage: paramData.greetingLanguage || 'uk',
                          voiceType: paramData.voiceType || 'female',
                          useStarStyle: paramData.useStarStyle || false,
                          artistStyle: paramData.artistStyle || ''
                        })
                        console.log('✅ Дані форми дозавантажено з параметрів')
                      } catch (e) {
                        console.log('⚠️ Не вдалося розпарсити параметри:', e)
                      }
                    }
                  }
                } catch (error) {
                  console.error('❌ Помилка дозавантаження даних форми:', error)
                }
              }, 100)
            }
            
            // Если генерация не завершена, проверяем статус и запускаем SSE
            if (state.currentStatus !== 'SUCCESS' && state.currentStatus !== 'FAILED' && state.currentStatus !== 'GENERATE_AUDIO_FAILED') {
              // Сначала проверяем текущий статус
              setTimeout(() => {
                if (!isCheckingStatus.current) {
                  checkCurrentStatus(greetingId)
                }
              }, 500)
              
              // Затем запускаем SSE соединение
              setTimeout(() => {
                if (!isWaitingForCompletion.current) {
                  startSSEConnection(greetingId)
                }
              }, 1500)
            }
            return
          }
        }
        
        // Затем проверяем общее состояние генерации
        if (savedState) {
          const state = JSON.parse(savedState)
          console.log('📋 Дані з загального localStorage:', {
            taskId: state.taskId,
            currentStatus: state.currentStatus,
            hasFormData: !!state.formData?.recipientName,
            hasText: !!state.generatedText
          })
          
          // Если есть активная генерация для этого taskId
          if (state.taskId === greetingId) {
            console.log('✅ Відновлюю активну генерацію з загального localStorage')
            
            // Восстанавливаем данные даже если formData неполные
            if (state.formData) {
              setFormData(state.formData)
            }
            setGeneratedText(state.generatedText || '')
            setGeneratedMusicUrl(state.generatedMusicUrl || '')
            setSecondMusicUrl(state.secondMusicUrl || '')
            setGeneratedCoverUrl(state.generatedCoverUrl || '')
            setSelectedPlan(state.selectedPlan || 'basic')
            setCurrentStatus(state.currentStatus || 'PENDING')
            setTaskId(state.taskId)
            setIsGenerating(state.currentStatus !== 'SUCCESS' && state.currentStatus !== 'FAILED' && state.currentStatus !== 'GENERATE_AUDIO_FAILED')
            
            // Если данные формы неполные, пытаемся дозагрузить из статуса генерации
            if (!state.formData?.recipientName) {
              console.log('⚠️ Дані форми неповні, дозавантажую з статусу генерації')
              setTimeout(async () => {
                try {
                  const statusResponse = await fetch(`/api/generate/music/status?taskId=${greetingId}`)
                  if (statusResponse.ok) {
                    const statusResult = await statusResponse.json()
                    if (statusResult.success && statusResult.formData) {
                      setFormData(statusResult.formData)
                      console.log('✅ Дані форми дозавантажено з статусу')
                    } else if (statusResult.param) {
                      try {
                        const paramData = JSON.parse(statusResult.param)
                        setFormData({
                          recipientName: paramData.recipientName || '',
                          occasion: paramData.occasion || '',
                          relationship: paramData.relationship || '',
                          personalDetails: paramData.personalDetails || '',
                          musicStyle: paramData.musicStyle || 'pop',
                          mood: paramData.mood || 'joyful',
                          greetingLanguage: paramData.greetingLanguage || 'uk',
                          voiceType: paramData.voiceType || 'female',
                          useStarStyle: paramData.useStarStyle || false,
                          artistStyle: paramData.artistStyle || ''
                        })
                        console.log('✅ Дані форми дозавантажено з параметрів')
                      } catch (e) {
                        console.log('⚠️ Не вдалося розпарсити параметри:', e)
                      }
                    }
                  }
                } catch (error) {
                  console.error('❌ Помилка дозавантаження даних форми:', error)
                }
              }, 100)
            }
            
            // Если генерация не завершена, запускаем SSE
            if (state.currentStatus !== 'SUCCESS' && state.currentStatus !== 'FAILED' && state.currentStatus !== 'GENERATE_AUDIO_FAILED') {
              setTimeout(() => {
                if (!isWaitingForCompletion.current) {
                  startSSEConnection(greetingId)
                }
              }, 2000)
            }
            return
          }
        }
      }
      
      // Если ничего не найдено в localStorage — загружаем из базы
      await loadGreetingData()
    }
    
    restoreState()
  }, [greetingId])

// Проверяем, что данные загрузились правильно
useEffect(() => {
  console.log('📊 Поточний стан після завантаження:', {
    formData: formData.recipientName,
    generatedText: generatedText?.substring(0, 50),
    currentStatus,
    taskId,
    isGenerating
  })
}, [formData.recipientName, generatedText, currentStatus, taskId, isGenerating])

// Добавляем логирование изменений состояния
useEffect(() => {
  console.log('🔄 СТАТУС ЗМІНИВСЯ:', currentStatus)
  console.log('🔄 Поточний час:', new Date().toISOString())
  console.log('🔄 isGenerating:', isGenerating)
}, [currentStatus])

useEffect(() => {
  console.log('📝 Зміна generatedText:', generatedText?.substring(0, 100))
  console.log('📝 Тип generatedText:', typeof generatedText)
  if (typeof generatedText === 'object') {
    console.log('📝 generatedText як об\'єкт:', generatedText)
  }
}, [generatedText])

useEffect(() => {
  console.log('📋 Зміна formData:', {
    recipientName: formData.recipientName,
    occasion: formData.occasion,
    relationship: formData.relationship,
    musicStyle: formData.musicStyle,
    mood: formData.mood,
    greetingLanguage: formData.greetingLanguage,
    personalDetails: formData.personalDetails
  })
  console.log('📋 Типи formData:', {
    recipientName: typeof formData.recipientName,
    occasion: typeof formData.occasion,
    relationship: typeof formData.relationship,
    musicStyle: typeof formData.musicStyle,
    mood: typeof formData.mood,
    greetingLanguage: typeof formData.greetingLanguage,
    personalDetails: typeof formData.personalDetails
  })
}, [formData])

useEffect(() => {
  console.log('🖼️ Зміна generatedCoverUrl:', generatedCoverUrl)
  console.log('🖼️ Тип generatedCoverUrl:', typeof generatedCoverUrl)
  console.log('🖼️ Довжина generatedCoverUrl:', generatedCoverUrl?.length)
}, [generatedCoverUrl])

useEffect(() => {
  console.log('🎵 Зміна generatedMusicUrl:', generatedMusicUrl)
}, [generatedMusicUrl])

useEffect(() => {
  console.log('🎵 Зміна secondMusicUrl:', secondMusicUrl)
}, [secondMusicUrl])

// Логирование рендера обложки
useEffect(() => {
  console.log('🖼️ Рендер: поточне значення обкладинки:', generatedCoverUrl)
  console.log('🖼️ Рендер: тип обкладинки:', typeof generatedCoverUrl)
  console.log('🖼️ Рендер: довжина обкладинки:', generatedCoverUrl?.length)
  console.log('🖼️ Рендер: чи генерується:', isGenerating)
}, [generatedCoverUrl, isGenerating])

const loadGreetingData = async () => {
  if (!session?.user?.email) {
    console.log('❌ Немає сесії користувача')
    return
  }
  
  try {
    console.log('🔍 Завантажую дані привітання для:', greetingId)
    
    // Сначала проверяем localStorage
    if (typeof window !== 'undefined') {
      const savedState = localStorage.getItem('generationState')
      const savedGreetingState = localStorage.getItem(`greeting_${greetingId}`)
      
      if (savedGreetingState) {
        const state = JSON.parse(savedGreetingState)
        if (state.taskId === greetingId && state.formData?.recipientName) {
          console.log('✅ Відновлюю стан з greeting localStorage')
          setFormData(state.formData)
          setGeneratedText(state.generatedText || '')
          setGeneratedMusicUrl(state.generatedMusicUrl || '')
          setSecondMusicUrl(state.secondMusicUrl || '')
          setGeneratedCoverUrl(state.generatedCoverUrl || '')
          setSelectedPlan(state.selectedPlan || 'basic')
          setCurrentStatus(state.currentStatus || 'PENDING')
          setTaskId(state.taskId)
          setIsGenerating(state.currentStatus !== 'SUCCESS' && state.currentStatus !== 'FAILED' && state.currentStatus !== 'GENERATE_AUDIO_FAILED')
          
          // Если генерация не завершена, проверяем статус и запускаем SSE
          if (state.currentStatus !== 'SUCCESS' && state.currentStatus !== 'FAILED' && state.currentStatus !== 'GENERATE_AUDIO_FAILED') {
            // Сначала проверяем текущий статус
            setTimeout(() => {
              if (!isCheckingStatus.current) {
                checkCurrentStatus(greetingId)
              }
            }, 500)
            
            // Затем запускаем SSE соединение
            setTimeout(() => {
              if (!isWaitingForCompletion.current) {
                startSSEConnection(greetingId)
              }
            }, 1500)
          }
          return
        }
      }
      
      if (savedState) {
        const state = JSON.parse(savedState)
        if (state.taskId === greetingId && state.formData?.recipientName) {
          console.log('✅ Відновлюю стан з загального localStorage')
          setFormData(state.formData)
          setGeneratedText(state.generatedText || '')
          setGeneratedMusicUrl(state.generatedMusicUrl || '')
          setSecondMusicUrl(state.secondMusicUrl || '')
          setGeneratedCoverUrl(state.generatedCoverUrl || '')
          setSelectedPlan(state.selectedPlan || 'basic')
          setCurrentStatus(state.currentStatus || 'PENDING')
          setTaskId(state.taskId)
          setIsGenerating(state.currentStatus !== 'SUCCESS' && state.currentStatus !== 'FAILED' && state.currentStatus !== 'GENERATE_AUDIO_FAILED')
          
          // Если данные формы неполные, пытаемся дозагрузить из статуса генерации
          if (!state.formData?.recipientName) {
            console.log('⚠️ Дані форми неповні, дозавантажую з статусу генерації')
            setTimeout(async () => {
              try {
                const statusResponse = await fetch(`/api/generate/music/status?taskId=${greetingId}`)
                if (statusResponse.ok) {
                  const statusResult = await statusResponse.json()
                  if (statusResult.success && statusResult.formData) {
                    setFormData(statusResult.formData)
                    console.log('✅ Дані форми дозавантажено з статусу')
                  } else if (statusResult.param) {
                    try {
                      const paramData = JSON.parse(statusResult.param)
                      setFormData({
                        recipientName: paramData.recipientName || '',
                        occasion: paramData.occasion || '',
                        relationship: paramData.relationship || '',
                        personalDetails: paramData.personalDetails || '',
                        musicStyle: paramData.musicStyle || 'pop',
                        mood: paramData.mood || 'joyful',
                        greetingLanguage: paramData.greetingLanguage || 'uk',
                        voiceType: paramData.voiceType || 'female',
                        useStarStyle: paramData.useStarStyle || false,
                        artistStyle: paramData.artistStyle || ''
                      })
                      console.log('✅ Дані форми дозавантажено з параметрів')
                    } catch (e) {
                      console.log('⚠️ Не вдалося розпарсити параметри:', e)
                    }
                  }
                }
              } catch (error) {
                console.error('❌ Помилка дозавантаження даних форми:', error)
              }
            }, 100)
          }
          
          // Если генерация не завершена, проверяем статус и запускаем SSE
          if (state.currentStatus !== 'SUCCESS' && state.currentStatus !== 'FAILED' && state.currentStatus !== 'GENERATE_AUDIO_FAILED') {
            // Сначала проверяем текущий статус
            setTimeout(() => {
              if (!isCheckingStatus.current) {
                checkCurrentStatus(greetingId)
              }
            }, 500)
            
            // Затем запускаем SSE соединение
            setTimeout(() => {
              if (!isWaitingForCompletion.current) {
                startSSEConnection(greetingId)
              }
            }, 1500)
          }
          return
        }
      }
    }
    
    // Проверяем API приветствий
    const response = await fetch(`/api/greetings`)
    if (response.ok) {
      const data = await response.json()
      const greeting = data.greetings?.find((g: any) => g.taskId === greetingId || g.id === greetingId)
      
      if (greeting) {
        console.log('✅ Знайдено привітання в базі даних')
        setFormData({
          recipientName: greeting.recipientName,
          occasion: greeting.occasion,
          relationship: greeting.relationship,
          personalDetails: greeting.personalDetails,
          musicStyle: greeting.musicStyle,
          mood: greeting.mood,
          greetingLanguage: greeting.greetingLanguage,
          voiceType: greeting.voiceType || 'female',
          useStarStyle: greeting.useStarStyle || false,
          artistStyle: greeting.artistStyle || ''
        })
        setGeneratedText(greeting.text)
        setGeneratedMusicUrl(greeting.musicUrl || '')
        setSecondMusicUrl(greeting.secondMusicUrl || '')
        setGeneratedCoverUrl(
          greeting.plan === 'premium'
            ? (greeting.openaiCoverUrl && greeting.openaiCoverUrl.length > 0 ? greeting.openaiCoverUrl : (greeting.coverUrl && greeting.coverUrl.includes('openai') ? greeting.coverUrl : ''))
            : (greeting.coverUrl || '')
        )
        setSelectedPlan(greeting.plan)
        setTaskId(greetingId)
        setIsGenerating(false)
        setCurrentStatus('SUCCESS')
        
        // Проверяем, является ли поздравление публичным
        const isGreetingPublic = greeting.allowSharing === true || greeting.makePublic === true
        setIsPublic(isGreetingPublic)
        console.log('🔍 Статус публічності привітання:', isGreetingPublic)
        
        return
      }
    }
    
    // Если не найдено в API приветствий, проверяем статус генерации
    console.log('🔍 Привітання не знайдено в базі, перевіряю статус генерації')
    const statusResponse = await fetch(`/api/generate/music/status?taskId=${greetingId}`)
    
    if (statusResponse.ok) {
      const statusResult = await statusResponse.json()
      console.log('📊 Статус генерації:', statusResult)
      
      if (statusResult.success && statusResult.status) {
        // Восстанавливаем состояние из статуса
        setTaskId(greetingId)
        setIsGenerating(statusResult.status !== 'SUCCESS')
        
        // Восстанавливаем данные формы из статуса
        if (statusResult.formData) {
          setFormData(statusResult.formData)
        } else if (statusResult.param) {
          try {
            const paramData = JSON.parse(statusResult.param)
            setFormData({
              recipientName: paramData.recipientName || '',
              occasion: paramData.occasion || '',
              relationship: paramData.relationship || '',
              personalDetails: paramData.personalDetails || {},
              musicStyle: paramData.musicStyle || 'pop',
              mood: paramData.mood || 'joyful',
              greetingLanguage: paramData.greetingLanguage || 'uk',
              voiceType: paramData.voiceType || 'female',
              useStarStyle: paramData.useStarStyle || false,
              artistStyle: paramData.artistStyle || ''
            })
          } catch (e) {
            console.log('⚠️ Не вдалося розпарсити параметри:', e)
          }
        }
        
        if (statusResult.status === 'SUCCESS') {
          setCurrentStatus('SUCCESS')
          setGeneratedMusicUrl(statusResult.musicUrl || '')
          setSecondMusicUrl(statusResult.secondMusicUrl || '')
          setGeneratedCoverUrl(statusResult.coverUrl || '')
          setGeneratedText(statusResult.text || '')
          setIsGenerating(false)
        } else {
          // Если статус не SUCCESS, устанавливаем текущий статус и запускаем SSE
          setCurrentStatus(statusResult.status as any)
          setIsGenerating(true)
          
          if (statusResult.text) {
            setGeneratedText(statusResult.text)
          }
          if (statusResult.musicUrl) {
            setGeneratedMusicUrl(statusResult.musicUrl)
          }
          if (statusResult.secondMusicUrl) {
            setSecondMusicUrl(statusResult.secondMusicUrl)
          }
          if (statusResult.coverUrl) {
            setGeneratedCoverUrl(statusResult.coverUrl)
          }
          
          // Сначала проверяем текущий статус, затем запускаем SSE
          setTimeout(() => {
            if (!isCheckingStatus.current) {
              checkCurrentStatus(greetingId)
            }
          }, 500)
          
          setTimeout(() => {
            if (!isWaitingForCompletion.current) {
              startSSEConnection(greetingId)
            }
          }, 1500)
        }
        return
      }
    }
    
    // Если ничего не найдено, показываем сообщение об ошибке но НЕ перенаправляем
    console.log('❌ Привітання не знайдено')
    safeToast.error('Привітання не знайдено. Можливо, воно ще генерується або було видалено.')
    
  } catch (error) {
    console.error('Помилка завантаження даних:', error)
    safeToast.error('Помилка завантаження даних')
  }
}

const checkCurrentStatus = async (taskId: string) => {
  if (isCheckingStatus.current) {
    console.log('🔄 Перевірка статусу вже виконується, пропускаю')
    return
  }
  
  isCheckingStatus.current = true
  console.log('🔍 Перевіряю поточний статус для taskId:', taskId)
  
  try {
    const response = await fetch(`/api/generate/music/status?taskId=${taskId}`)
    const result = await response.json()
    
    console.log('📊 Поточний статус з API:', result)
    
    if (result.success && result.status) {
      console.log('📋 Отримано статус з сервера:', result.status)
      
      // Прямо устанавливаем статус с сервера
      if (currentStatus !== result.status) {
        console.log(`🔄 Оновлюю статус з ${currentStatus} на ${result.status}`)
        setCurrentStatus(result.status as GenerationStatus)
        
        // Обновляем данные если они есть
        if (result.text && result.text !== generatedText) {
          console.log('📝 Оновлюю текст з API')
          setGeneratedText(result.text)
        }
        if (result.musicUrl && result.musicUrl !== generatedMusicUrl) {
          console.log('🎵 Оновлюю musicUrl з API')
          setGeneratedMusicUrl(result.musicUrl)
        }
        if (result.secondMusicUrl && result.secondMusicUrl !== secondMusicUrl) {
          console.log('🎵 Оновлюю secondMusicUrl з API')
          setSecondMusicUrl(result.secondMusicUrl)
        }
        if (result.coverUrl && result.coverUrl !== generatedCoverUrl) {
          console.log('🖼️ Оновлюю coverUrl з API')
          setGeneratedCoverUrl(result.coverUrl)
        }
        
        // Обновляем состояние генерации
        const isStillGenerating = result.status !== 'SUCCESS' && result.status !== 'FAILED' && result.status !== 'GENERATE_AUDIO_FAILED'
        setIsGenerating(isStillGenerating)
        
        // Если генерация не завершена, запускаем SSE соединение
        if (isStillGenerating && !isWaitingForCompletion.current) {
          console.log('🔄 Запускаю SSE підключення для статусу:', result.status)
          startSSEConnection(taskId)
        }
        
        // Сохраняем состояние после обновления
        setTimeout(() => {
          console.log('💾 Зберігаю після оновлення статусу:', result.status)
          saveState().catch(error => console.error('❌ Помилка збереження стану:', error))
        }, 100)
      } else {
        console.log('📋 Статус не змінився:', result.status)
      }
    }
  } catch (error) {
    console.error('Помилка перевірки поточного статусу:', error)
  } finally {
    isCheckingStatus.current = false
  }
}

// Функция для подключения к SSE и получения обновлений в реальном времени
const startSSEConnection = (taskId: string) => {
  if (isWaitingForCompletion.current) {
    console.log('🔄 SSE підключення вже запущено, пропускаю')
    return
  }
  
  isWaitingForCompletion.current = true
  console.log('🔗 Запускаю SSE підключення для taskId:', taskId)
  
  // Закрываем предыдущее соединение, если оно есть
  if (eventSourceRef.current) {
    eventSourceRef.current.close()
  }
  
  // Создаем новое SSE соединение
  const eventSource = new EventSource(`/api/generate/music/stream?taskId=${taskId}`)
  eventSourceRef.current = eventSource
  
  // Обработчик подключения
  eventSource.onopen = () => {
    console.log('🔗 SSE підключення встановлено')
  }
  
  // Обработчик сообщений
  eventSource.onmessage = async (event) => {
    if (isSSEClosed.current) return
    try {
      const data = JSON.parse(event.data)
      console.log('📡 SSE повідомлення:', data)
      
      if (data.type === 'status_update' && data.status) {
        console.log('📡 SSE: отримано оновлення статусу:', data.status)
        console.log('📡 SSE: поточний статус на клієнті:', currentStatus)
        console.log('📡 SSE: дані:', data.data)
        
        // Обновляем статус только если он изменился
        if (currentStatus !== data.status) {
          console.log(`📡 SSE: оновлюю статус з ${currentStatus} на ${data.status}`)
          setCurrentStatus(data.status as GenerationStatus)
          
          // Обновляем состояние генерации
          const isStillGenerating = data.status !== 'SUCCESS' && data.status !== 'FAILED' && data.status !== 'GENERATE_AUDIO_FAILED'
          setIsGenerating(isStillGenerating)
          
                     // Показываем уведомления только при смене статуса
          if (data.status === 'TEXT_SUCCESS') {
            safeToast.success('Текст готовий! AI створює музичну композицію...')
          } else if (data.status === 'FIRST_SUCCESS') {
            safeToast.success('Музика створюється! Генерується фінальна версія...')
          } else if (data.status === 'SUCCESS') {
            setIsUpdatingMusic(false)
            safeToast.success('Музика створена успішно!')
          } else if (data.status === 'FAILED') {
            safeToast.error('Помилка генерації. Спробуйте ще раз.')
          } else if (data.status === 'GENERATE_AUDIO_FAILED') {
            safeToast.error('Помилка генерації аудіо. Спробуйте ще раз.')
          }
        }
        
        // Обновляем данные независимо от статуса
        if (data.data?.text && data.data.text !== generatedText) {
          console.log('📡 SSE: оновлюю текст')
          setGeneratedText(data.data.text)
        }
        if (data.data?.musicUrl && data.data.musicUrl !== generatedMusicUrl) {
          console.log('📡 SSE: оновлюю musicUrl')
          setGeneratedMusicUrl(data.data.musicUrl)
        }
        if (data.data?.secondMusicUrl && data.data.secondMusicUrl !== secondMusicUrl) {
          console.log('📡 SSE: оновлюю secondMusicUrl')
          setSecondMusicUrl(data.data.secondMusicUrl)
        }
        if (data.data?.coverUrl && data.data.coverUrl !== generatedCoverUrl) {
          console.log('📡 SSE: оновлюю coverUrl')
          setGeneratedCoverUrl(data.data.coverUrl)
        }
        
                 // Специальная обработка для SUCCESS и ошибочных статусов
         if (data.status === 'SUCCESS') {
          
          // Сохраняем приветствие в основную таблицу
          const saveGreetingToDatabase = async () => {
            try {
              console.log('💾 Зберігаю привітання в основну таблицю при завершенні генерації')
              
              // Получаем актуальные цены из настроек
              let basicPrice = 100;
              let premiumPrice = 200;
              
              try {
                const settingsResponse = await fetch('/api/admin/settings');
                if (settingsResponse.ok) {
                  const settings = await settingsResponse.json();
                  basicPrice = settings.basicPlanPrice || 100;
                  premiumPrice = settings.premiumPlanPrice || 200;
                }
              } catch (settingsError) {
                console.log('⚠️ Не вдалося отримати налаштування, використовую дефолтні ціни');
              }
              
              const response = await fetch('/api/greetings/auto-save', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  taskId: taskId,
                  recipientName: formData.recipientName,
                  occasion: formData.occasion,
                  relationship: formData.relationship,
                  personalDetails: formData.personalDetails,
                  musicStyle: formData.musicStyle,
                  mood: formData.mood,
                  greetingLanguage: formData.greetingLanguage,
                  text: data.data?.text || generatedText,
                  plan: selectedPlan,
                  totalPrice: selectedPlan === 'premium' ? premiumPrice : basicPrice,
                  paymentMethod: 'liqpay',
                  musicUrl: data.data?.musicUrl || '',
                  secondMusicUrl: data.data?.secondMusicUrl || '',
                  coverUrl: data.data?.coverUrl || '',
                  allowSharing: false,
                  status: 'SUCCESS'
                })
              })

              if (response.ok) {
                const result = await response.json()
                console.log('✅ Привітання збережено в основну таблицю:', result.greeting.id)
              } else {
                console.error('❌ Помилка збереження привітання в основну таблицю:', response.status)
              }
            } catch (greetingError) {
              console.error('❌ Помилка збереження привітання в основну таблицю:', greetingError)
            }
          }
          
          // Вызываем функцию сохранения
          saveGreetingToDatabase()
          
          // Очищаем кеш при завершении
          fetch(`/api/generate/music/clear-cache?taskId=${taskId}`, { method: 'POST' })
            .then(() => console.log('🗑️ Кеш очищено при завершенні генерації'))
            .catch(error => console.log('⚠️ Не вдалося очистити кеш:', error))
        }
        
        // Закрываем SSE соединение для финальных статусов
        if (data.status === 'SUCCESS' || data.status === 'FAILED' || data.status === 'GENERATE_AUDIO_FAILED') {
          if (!isSSEClosed.current && eventSource.readyState !== EventSource.CLOSED) {
            eventSource.close()
            isSSEClosed.current = true
          }
          eventSourceRef.current = null
          isWaitingForCompletion.current = false
          
          // Сбрасываем состояние генерации для новых генераций
          setTimeout(() => {
            localStorage.removeItem('generationState')
            console.log('🧹 Стан генерації очищено для нових генерацій')
          }, 1000)
        }
        
        // Сохраняем состояние после каждого обновления
        setTimeout(() => {
          console.log('💾 SSE: зберігаю після оновлення статусу:', data.status)
          saveState().catch(error => console.error('❌ Помилка збереження стану:', error))
        }, 100)
        
      } else if (data.type === 'generation_complete') {
        console.log('✅ SSE: генерація завершена')
        setIsGenerating(false)
        if (!isSSEClosed.current && eventSource.readyState !== EventSource.CLOSED) {
          eventSource.close()
          isSSEClosed.current = true
        }
        eventSourceRef.current = null
        isWaitingForCompletion.current = false
        
              } else if (data.type === 'generation_failed' || data.type === 'generate_audio_failed') {
        console.log('❌ SSE: генерація не вдалася')
        setCurrentStatus(data.type === 'generate_audio_failed' ? 'GENERATE_AUDIO_FAILED' : 'FAILED')
        setIsGenerating(false)
        safeToast.error('Генерація не вдалася. Спробуйте ще раз.')
        if (!isSSEClosed.current && eventSource.readyState !== EventSource.CLOSED) {
          eventSource.close()
          isSSEClosed.current = true
        }
        eventSourceRef.current = null
        isWaitingForCompletion.current = false
        
      } else if (data.type === 'timeout') {
        console.log('⏰ SSE: час очікування вичерпано')
        setIsGenerating(false)
        safeToast.error('Час генерації вичерпано. Спробуйте ще раз.')
        if (!isSSEClosed.current && eventSource.readyState !== EventSource.CLOSED) {
          eventSource.close()
          isSSEClosed.current = true
        }
        eventSourceRef.current = null
        isWaitingForCompletion.current = false
        
      } else if (data.type === 'error') {
        console.log('❌ SSE: помилка:', data.error)
        safeToast.error('Помилка підключення. Перевірте з\'єднання.')
        if (!isSSEClosed.current && eventSource.readyState !== EventSource.CLOSED) {
          eventSource.close()
          isSSEClosed.current = true
        }
        eventSourceRef.current = null
        isWaitingForCompletion.current = false
      }
    } catch (error) {
      if (!isSSEClosed.current && eventSource.readyState !== EventSource.CLOSED) {
        eventSource.close()
        isSSEClosed.current = true
      }
      eventSourceRef.current = null
      isWaitingForCompletion.current = false
      console.error('❌ Помилка обробки SSE повідомлення:', error)
    }
  }
  
  // Обработчик ошибок
  eventSource.onerror = (error) => {
    if (!isSSEClosed.current && eventSource.readyState !== EventSource.CLOSED) {
      eventSource.close()
      isSSEClosed.current = true
    }
    eventSourceRef.current = null
    isWaitingForCompletion.current = false
    console.error('❌ SSE помилка підключення:', error)
    safeToast.error('Помилка підключення до сервера')
  }
}

// Сохраняем состояние при изменениях (убираем частые вызовы)
useEffect(() => {
  if (taskId) {
    console.log('💾 Зберігаю стан при зміні:', { taskId, currentStatus, formData: formData.recipientName, generatedText: generatedText?.substring(0, 50) })
    saveState().catch(error => console.error('❌ Помилка збереження стану:', error))
  }
}, [currentStatus, generatedMusicUrl, secondMusicUrl, generatedCoverUrl, formData.recipientName])

// Очищаем интервал и SSE соединение при размонтировании компонента
useEffect(() => {
  return () => {
    if (statusCheckInterval.current) {
      console.log('🧹 Очищаю інтервал при розмонтуванні компонента')
      clearInterval(statusCheckInterval.current)
      statusCheckInterval.current = null
    }
    if (eventSourceRef.current) {
      if (!isSSEClosed.current && eventSourceRef.current.readyState !== EventSource.CLOSED) {
        eventSourceRef.current.close()
        isSSEClosed.current = true
      }
      eventSourceRef.current = null
    }
    if (isWaitingForCompletion.current) {
      isWaitingForCompletion.current = false
    }
  }
}, [])

// Функция для сохранения состояния
const saveState = async () => {
  if (!taskId) return
  
  const state = {
    taskId,
    currentStatus,
    generatedText,
    generatedCoverUrl,
    generatedMusicUrl,
    secondMusicUrl,
    selectedPlan,
    formData: {
      recipientName: formData.recipientName || '',
      occasion: formData.occasion || '',
      relationship: formData.relationship || '',
      personalDetails: formData.personalDetails || {},
      musicStyle: formData.musicStyle || '',
      mood: formData.mood || '',
      greetingLanguage: formData.greetingLanguage || '',
      voiceType: formData.voiceType || 'female',
      useStarStyle: formData.useStarStyle || false,
      artistStyle: formData.artistStyle || ''
    },
    isUpdatingMusic,
    isGenerating: currentStatus !== 'SUCCESS' && currentStatus !== 'FAILED' && currentStatus !== 'GENERATE_AUDIO_FAILED'
  }
  
  console.log('💾 saveState: зберігаю стан:', { 
    taskId, 
    currentStatus, 
    hasFormData: !!state.formData.recipientName,
    hasText: !!generatedText 
  })
  
  // Сохраняем в localStorage всегда, если есть taskId
  localStorage.setItem(`greeting_${taskId}`, JSON.stringify(state))
  
  // Также сохраняем в базу данных, если есть хотя бы минимальные данные
  if (taskId) {
    try {
      const status = currentStatus
      
      console.log('💾 saveState: зберігаю статус:', status, 'для кроку:', currentStatus)
      
      await fetch('/api/generate/music/save-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId,
          status,
          type: currentStatus,
          musicUrl: generatedMusicUrl || '',
          coverUrl: generatedCoverUrl || '',
          secondMusicUrl: secondMusicUrl || '',
          data: { formData, generatedText, selectedPlan },
          formData: state.formData,
          text: generatedText || ''
        })
      })
      console.log('💾 Стан збережено в БД для taskId:', taskId)
    } catch (error) {
      console.error('❌ Помилка збереження стану в БД:', error)
    }
  }
}

// Обработчики плеера
const handlePlayPause = () => {
  if (audioRef.current) {
    if (isPlaying) {
      // Останавливаем первую версию
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      // Останавливаем вторую версию, если она играет
      if (audioRefSecond.current && isPlayingSecond) {
        audioRefSecond.current.pause()
        setIsPlayingSecond(false)
      }
      
      // Запускаем первую версию
      audioRef.current.play()
      setIsPlaying(true)
      
      // Показываем попап публичности через 10 секунд, если еще не показывали и поздравление не публичное
      if (!hasShownPublicityPrompt && currentStatus === 'SUCCESS' && !isPublic && taskId) {
        setTimeout(() => {
          if (!hasShownPublicityPrompt && !isPublic && taskId) {
            setShowPublicityModal(true)
            setHasShownPublicityPrompt(true)
          }
        }, 10000)
      }
    }
  }
}

const handlePlayPauseSecond = () => {
  if (audioRefSecond.current) {
    if (isPlayingSecond) {
      // Останавливаем вторую версию
      audioRefSecond.current.pause()
      setIsPlayingSecond(false)
    } else {
      // Останавливаем первую версию, если она играет
      if (audioRef.current && isPlaying) {
        audioRef.current.pause()
        setIsPlaying(false)
      }
      
      // Запускаем вторую версию
      audioRefSecond.current.play()
      setIsPlayingSecond(true)
      
      // Показываем попап публичности через 10 секунд, если еще не показывали и поздравление не публичное
      if (!hasShownPublicityPrompt && currentStatus === 'SUCCESS' && !isPublic && taskId) {
        setTimeout(() => {
          if (!hasShownPublicityPrompt && !isPublic && taskId) {
            setShowPublicityModal(true)
            setHasShownPublicityPrompt(true)
          }
        }, 10000)
      }
    }
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
  if (audioRef.current) {
    const time = parseFloat(e.target.value)
    audioRef.current.currentTime = time
    setCurrentTime(time)
  }
}

const handleSeekSecond = (e: React.ChangeEvent<HTMLInputElement>) => {
  if (audioRefSecond.current) {
    const time = parseFloat(e.target.value)
    audioRefSecond.current.currentTime = time
    setCurrentTimeSecond(time)
  }
}

const formatTime = (time: number) => {
  if (!isFinite(time) || isNaN(time)) {
    return '0:00'
  }
  const minutes = Math.floor(time / 60)
  const seconds = Math.floor(time % 60)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

const handleDownload = () => {
  if (generatedMusicUrl) {
    const link = document.createElement('a')
    link.href = generatedMusicUrl
    link.download = `greeting-${taskId}.mp3`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}

const handleShare = () => {
  if (navigator.share) {
    navigator.share({
      title: 'Моє привітання',
      text: 'Подивіться на моє унікальне привітання!',
      url: window.location.href
    })
  } else {
    navigator.clipboard.writeText(window.location.href)
    alert('Посилання скопійовано в буфер обміну!')
  }
}

const handlePublicityChoice = async (allowSharing: boolean) => {
  setShowPublicityModal(false)
  
  if (allowSharing && taskId) {
    try {
      console.log('🔄 Оновлення статусу публічності для:', taskId)
      
      // Обновляем поздравление в БД, помечая его как публичное
      const response = await fetch(`/api/greetings/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          allowSharing: true,
          makePublic: true // Добавляем оба поля для совместимости
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log('✅ Статус публічності оновлено:', result)
        safeToast.success('Дякуємо! Ваше привітання додано до публічних прикладів.')
        
        // Обновляем локальное состояние
        console.log('✅ Локальний стан оновлено')
      } else {
        const errorData = await response.json()
        console.error('❌ Помилка оновлення статусу публічності:', errorData)
        safeToast.error('Помилка оновлення статусу публічності')
      }
    } catch (error) {
      console.error('❌ Помилка оновлення статусу публічності:', error)
      safeToast.error('Помилка оновлення статусу публічності')
    }
  } else {
    console.log('ℹ️ Користувач відмовився від публікації')
  }
}

// Компактная система статусов генерации
const getStatusInfo = (status: string) => {
  switch (status) {
    case 'PENDING':
      return {
        title: 'Підготовка завдання',
        description: 'Ініціалізація процесу генерації...',
        icon: Upload,
        color: 'blue',
        progress: 10
      }
    case 'TEXT_SUCCESS':
      return {
        title: 'Текст готовий',
        description: 'AI створює музичну композицію...',
        icon: FileText,
        color: 'green',
        progress: 40
      }
    case 'FIRST_SUCCESS':
      return {
        title: 'Музика створюється',
        description: 'Генерується фінальна версія...',
        icon: Music,
        color: 'purple',
        progress: 70
      }
    case 'SUCCESS':
      return {
        title: 'Готово!',
        description: 'Ваше привітання створено успішно',
        icon: CheckCircle,
        color: 'green',
        progress: 100
      }
    case 'FAILED':
    case 'GENERATE_AUDIO_FAILED':
      return {
        title: 'Помилка генерації',
        description: 'Не вдалося створити музику. Спробуйте ще раз.',
        icon: X,
        color: 'red',
        progress: 0
      }
    default:
      return {
        title: 'Очікування',
        description: 'Отримання статусу...',
        icon: Clock,
        color: 'gray',
        progress: 0
      }
  }
}

// Получаем информацию о текущем статусе
const currentStatusInfo = getStatusInfo(currentStatus)

// Кроки генерації
const steps = [
  {
    id: 'PENDING',
    title: 'Підготовка завдання',
    description: 'Ініціалізація процесу генерації',
    icon: Upload,
    completed: ['TEXT_SUCCESS', 'FIRST_SUCCESS', 'SUCCESS'].includes(currentStatus)
  },
  {
    id: 'TEXT_SUCCESS',
    title: 'Генерація тексту',
    description: 'Створення унікального тексту пісні',
    icon: FileText,
    completed: ['FIRST_SUCCESS', 'SUCCESS'].includes(currentStatus)
  },
  {
    id: 'FIRST_SUCCESS',
    title: 'Створення музики',
    description: 'Генерація музичної композиції',
    icon: Music,
    completed: currentStatus === 'SUCCESS'
  },
  {
    id: 'SUCCESS',
    title: 'Фінальне оформлення',
    description: 'Створення обкладинки та завершення',
    icon: Image,
    completed: currentStatus === 'SUCCESS'
  }
]

// Определяем текущий шаг на основе статуса генерации
const getCurrentStep = (status: string): GenerationStatus => {
  console.log('🔍 getCurrentStep: статус:', status)
  // Просто возвращаем статус как есть, без лишних преобразований
  return status as GenerationStatus
}

// Безопасная функция для вывода любого значения
const safeValue = (value: any) => {
  if (typeof value === 'string' || typeof value === 'number') return value
  if (value == null) return '—'
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

// Безопасная функция для вывода текста
const safeText = (text: any) => {
  if (typeof text === 'string') return text
  if (text == null) return '—'
  try {
    return JSON.stringify(text)
  } catch {
    return String(text)
  }
}

if (status === 'loading') {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Завантаження...</p>
      </div>
    </div>
  )
}

if (!session) {
  router.push('/')
  return null
}

return (
  <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-600 to-indigo-800 p-6">
    <div className="max-w-6xl mx-auto">
      {/* Navigation */}
      <nav className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <button 
            onClick={() => router.push('/')}
            className="text-white hover:text-pink-200 transition-colors flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg"
          >
            <ArrowLeft size={20} />
            <span>Головна</span>
          </button>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Music size={28} />
            <span>Ваше привітання</span>
          </h1>
          {session && (
            <button 
              onClick={() => router.push('/dashboard')}
              className="text-white hover:text-pink-200 transition-colors flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg"
            >
              <BarChart3 size={20} />
              <span>Кабінет</span>
            </button>
          )}
        </div>
      </nav>

      {/* Content */}
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-pink-500 to-purple-600 p-8 text-white">
          <h1 className="text-4xl font-bold mb-2">
            {isGenerating ? '🎵 Створення привітання' : '🎉 Ваше привітання готове!'}
          </h1>
          <p className="text-xl opacity-90">
            {isGenerating 
              ? 'AI створює унікальну пісню для вашого особливого дня'
              : 'Унікальна музика створена успішно'
            }
          </p>
        </div>

        {/* Компактный прогресс генерации */}
        {isGenerating && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6">
            <div className="max-w-md mx-auto">
              <div className="flex items-center justify-center mb-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  currentStatusInfo.color === 'blue' ? 'bg-blue-500' :
                  currentStatusInfo.color === 'green' ? 'bg-green-500' :
                  currentStatusInfo.color === 'purple' ? 'bg-purple-500' :
                  currentStatusInfo.color === 'red' ? 'bg-red-500' :
                  'bg-gray-500'
                } text-white`}>
                  {currentStatusInfo.progress < 100 ? (
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                  ) : (
                    <currentStatusInfo.icon size={24} />
                  )}
                </div>
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                {currentStatusInfo.title}
              </h3>
              
              <p className="text-sm text-gray-600 text-center mb-4">
                {currentStatusInfo.description}
              </p>
              
              {/* Прогресс бар */}
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-500 ${
                    currentStatusInfo.color === 'blue' ? 'bg-blue-500' :
                    currentStatusInfo.color === 'green' ? 'bg-green-500' :
                    currentStatusInfo.color === 'purple' ? 'bg-purple-500' :
                    currentStatusInfo.color === 'red' ? 'bg-red-500' :
                    'bg-gray-500'
                  }`}
                  style={{ width: `${currentStatusInfo.progress}%` }}
                ></div>
              </div>
              
              <div className="text-xs text-gray-500 text-center mt-2">
                {currentStatusInfo.progress}% завершено
              </div>
            </div>
          </div>
        )}

        {/* Greeting Details */}
        <div className="p-8">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left Column - Audio Players */}
            <div className="space-y-6">
              {/* Main Audio Player */}
              <div className={`bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl p-6 ${isGenerating ? 'animate-pulse' : ''}`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                    <Music className="mr-2" />
                    Основна версія
                    {isGenerating && (
                      <div className="ml-2 animate-pulse bg-blue-500 text-white text-xs px-2 py-1 rounded">
                        Генерується...
                      </div>
                    )}
                  </h3>
                  {!isGenerating && generatedMusicUrl && (
                    <button
                      onClick={handleDownload}
                      className="flex items-center text-pink-600 hover:text-pink-700 transition-colors"
                    >
                      <Download className="mr-1" size={16} />
                      Завантажити
                    </button>
                  )}
                </div>
                
                {generatedMusicUrl && currentStatus === 'SUCCESS' ? (
                  <>
                    <audio
                      ref={audioRef}
                      src={generatedMusicUrl}
                      onTimeUpdate={handleTimeUpdate}
                      onLoadedMetadata={handleLoadedMetadata}
                      onEnded={() => setIsPlaying(false)}
                      className="hidden"
                    />
                    
                    <div className="flex items-center space-x-4 mb-4">
                      <button
                        onClick={handlePlayPause}
                        className="w-12 h-12 rounded-full flex items-center justify-center transition-colors bg-pink-500 text-white hover:bg-pink-600"
                      >
                        {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                      </button>
                      <div className="flex-1">
                        <div className="flex justify-between text-sm text-gray-600 mb-1">
                          <span>{formatTime(currentTime)}</span>
                          <span>{formatTime(duration)}</span>
                        </div>
                        <div className="relative">
                          {/* Фоновая полоска */}
                          <div className="absolute top-0 left-0 w-full h-2 bg-gray-200 rounded-lg z-0"></div>
                          {/* Визуальный индикатор прогресса */}
                          <div 
                            className="absolute top-0 left-0 h-2 bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg pointer-events-none transition-all duration-100 z-0"
                            style={{ 
                              width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' 
                            }}
                          />
                          <input
                            type="range"
                            min="0"
                            max={duration || 0}
                            value={currentTime}
                            onChange={handleSeek}
                            className="w-full h-2 bg-transparent rounded-lg appearance-none cursor-pointer slider relative z-10"
                            style={{
                              background: 'transparent',
                              height: '8px'
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center space-x-4 mb-4">
                    <button
                      disabled={true}
                      className="w-12 h-12 bg-gray-300 text-gray-500 rounded-full flex items-center justify-center cursor-not-allowed"
                    >
                      <Play size={20} />
                    </button>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>0:00</span>
                        <span>0:00</span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-lg">
                        <div className="h-2 bg-gray-300 rounded-lg animate-pulse"></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Second Audio Player */}
              {(secondMusicUrl && currentStatus === 'SUCCESS') && (
                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                      <Music className="mr-2" />
                      Альтернативна версія
                    </h3>
                  </div>
                  
                  {secondMusicUrl ? (
                    <>
                      <audio
                        ref={audioRefSecond}
                        src={secondMusicUrl}
                        onTimeUpdate={handleTimeUpdateSecond}
                        onLoadedMetadata={handleLoadedMetadataSecond}
                        onEnded={() => setIsPlayingSecond(false)}
                        className="hidden"
                      />
                      
                      <div className="flex items-center space-x-4 mb-4">
                        <button
                          onClick={handlePlayPauseSecond}
                          className="w-12 h-12 rounded-full flex items-center justify-center transition-colors bg-purple-500 text-white hover:bg-purple-600"
                        >
                          {isPlayingSecond ? <Pause size={20} /> : <Play size={20} />}
                        </button>
                        <div className="flex-1">
                          <div className="flex justify-between text-sm text-gray-600 mb-1">
                            <span>{formatTime(currentTimeSecond)}</span>
                            <span>{formatTime(durationSecond)}</span>
                          </div>
                          <div className="relative">
                            {/* Фоновая полоска */}
                            <div className="absolute top-0 left-0 w-full h-2 bg-gray-200 rounded-lg z-0"></div>
                            {/* Визуальный индикатор прогресса */}
                            <div 
                              className="absolute top-0 left-0 h-2 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg pointer-events-none transition-all duration-100 z-0"
                              style={{ 
                                width: durationSecond > 0 ? `${(currentTimeSecond / durationSecond) * 100}%` : '0%' 
                              }}
                            />
                            <input
                              type="range"
                              min="0"
                              max={durationSecond || 0}
                              value={currentTimeSecond}
                              onChange={handleSeekSecond}
                              className="w-full h-2 bg-transparent rounded-lg appearance-none cursor-pointer slider relative z-10"
                              style={{
                                background: 'transparent',
                                height: '8px'
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center space-x-4 mb-4">
                      <button
                        disabled={true}
                        className="w-12 h-12 bg-gray-300 text-gray-500 rounded-full flex items-center justify-center cursor-not-allowed"
                      >
                        <Play size={20} />
                      </button>
                      <div className="flex-1">
                        <div className="flex justify-between text-sm text-gray-600 mb-1">
                          <span>0:00</span>
                          <span>0:00</span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 rounded-lg">
                          <div className="h-2 bg-gray-300 rounded-lg animate-pulse"></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Column - Cover and Details */}
            <div className="space-y-6">
              {/* Cover Art */}
              <div className="bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl p-6 flex flex-col items-center">
                {generatedCoverUrl ? (
                  <img
                    src={generatedCoverUrl}
                    alt="Обкладинка"
                    className="w-64 h-64 object-cover rounded-xl shadow-lg mb-4"
                  />
                ) : (
                  <div className="w-64 h-64 flex items-center justify-center bg-gray-200 rounded-xl mb-4">
                    <Music size={64} className="text-gray-400" />
                  </div>
                )}
                {/* Существующий красивый блок с деталями поздравления */}
                <div className="w-full mt-4 space-y-2 text-gray-700 text-sm bg-white/80 rounded-xl p-4 border border-gray-200">
                  <div><b>Отримувач:</b> {safeValue(formData.recipientName)}</div>
                  <div><b>Привід:</b> {safeValue(formData.occasion)}</div>
                  <div><b>Стосунки:</b> {safeValue(formData.relationship)}</div>
                  <div><b>Стиль музики:</b> {safeValue(formData.musicStyle)}</div>
                  <div><b>Настрій:</b> {safeValue(formData.mood)}</div>
                  <div><b>Мова:</b> {safeValue(formData.greetingLanguage)}</div>
                  {formData.personalDetails && 
                   formData.personalDetails !== '{}' && 
                   formData.personalDetails !== 'null' && 
                   formData.personalDetails !== '' && 
                   <div><b>Деталі:</b> {safeValue(formData.personalDetails)}</div>}
                </div>
              </div>

              {/* Generated Text */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <FileText className="mr-2" />
                  Текст пісні
                  {isGenerating && (
                    <div className="ml-2 animate-pulse bg-blue-500 text-white text-xs px-2 py-1 rounded">
                      Оновлюється...
                    </div>
                  )}
                </h3>
                <div className="bg-white rounded-lg p-4 border">
                  <pre className="whitespace-pre-wrap text-sm text-gray-700 font-medium leading-relaxed">
                    {safeText(generatedText)}
                  </pre>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {!isGenerating && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
              <button
                onClick={handleShare}
                className="bg-gradient-to-r from-pink-500 to-purple-600 text-white py-3 px-8 rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <Share2 size={20} />
                Поділитися
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 px-8 rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <BarChart3 size={20} />
                Перейти до кабінету
              </button>
              <button
                onClick={() => router.push('/')}
                className="bg-gray-600 text-white py-3 px-8 rounded-xl font-semibold hover:bg-gray-700 transition-all flex items-center justify-center gap-2"
              >
                <Plus size={20} />
                Створити ще одне
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
    
    {/* Publicity Modal */}
    <PublicityModal
      isOpen={showPublicityModal}
      onClose={() => setShowPublicityModal(false)}
      onAllow={() => handlePublicityChoice(true)}
      onDecline={() => handlePublicityChoice(false)}
    />
    
    {/* Consent Modal */}
    {showConsentModal && (
      <ConsentModal
        isOpen={showConsentModal}
        onClose={handleConsentModalClose}
      />
    )}
  </div>
)
}