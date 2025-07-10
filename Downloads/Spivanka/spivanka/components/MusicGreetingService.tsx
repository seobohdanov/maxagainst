'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { LandingPage } from './pages/LandingPage'
import { ServicePage } from './pages/ServicePage'
import { ResultPage } from './pages/ResultPage'
import { DashboardPage } from './pages/DashboardPage'
import { ExamplesPage } from './pages/ExamplesPage'
import AuthModal from '@/components/modals/AuthModal'
import { FondyModal } from '@/components/modals/FondyModal'
import ConsentModal from '@/components/modals/ConsentModal'
import type { FormData, Greeting, Plan, GenerationState, MusicGenerationStep, GenerationStatus } from '@/types'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { safeToast } from '@/lib/toast'
import { generationService } from '@/services/generationService'
import { validateFormData, generateId, safeString } from '@/lib/utils'
import { useAppSettings } from '@/hooks/useAppSettings'
import { useBrowserLanguage } from '@/hooks/useBrowserLanguage'

export const MusicGreetingService = () => {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { settings } = useAppSettings()
  const { isRussianBrowser } = useBrowserLanguage()
  
  // Навигация между страницами
  const [currentView, setCurrentView] = useState<'landing' | 'service' | 'result' | 'dashboard' | 'examples'>('landing')
  
  // Принудительно устанавливаем landing при загрузке главной страницы
  useEffect(() => {
    console.log('🏠 Перевірка URL:', window.location.pathname)
    if (window.location.pathname === '/') {
      console.log('🏠 Встановлюю landing для головної сторінки')
      setCurrentView('landing')
    }
  }, [])
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showConsentModal, setShowConsentModal] = useState(false)
  const [authModalType, setAuthModalType] = useState<'login' | 'create'>('login')
  
  // Основное состояние
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [generatedText, setGeneratedText] = useState('')
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [isPaid, setIsPaid] = useState(false)
  const [promoCode, setPromoCode] = useState('')
  const [promoDiscount, setPromoDiscount] = useState(0)
  const [promoError, setPromoError] = useState('')
  const [isEditingText, setIsEditingText] = useState(false)
  const [makePublic, setMakePublic] = useState(false)
  
  // Состояние музыки и медиа
  const [generatedMusicUrl, setGeneratedMusicUrl] = useState('')
  const [secondMusicUrl, setSecondMusicUrl] = useState('')
  const [generatedCoverUrl, setGeneratedCoverUrl] = useState('')
  const [musicGenerationStep, setMusicGenerationStep] = useState<MusicGenerationStep>('uploading')
  const [isUpdatingMusic, setIsUpdatingMusic] = useState(false)
  
  // ID задачи
  const [taskId, setTaskId] = useState<string | null>(null)
  
  // Данные формы
  const [formData, setFormData] = useState<FormData>({
    recipientName: '',
    occasion: '',
    relationship: '',
    personalDetails: '',
    musicStyle: '',
    mood: '',
    greetingLanguage: isRussianBrowser ? 'ru' : 'uk',
    voiceType: 'female',
    useStarStyle: false,
    artistStyle: ''
  })
  
  // Управление состоянием в localStorage
  const [userGreetings, setUserGreetings] = useLocalStorage<Greeting[]>('userGreetings', [])

  // Восстановление состояния при загрузке
  useEffect(() => {
    const restoreState = () => {
      const savedState = generationService.loadGenerationState()
      if (savedState) {
        console.log('🔄 Відновлення стану генерації:', savedState)
        
        // Восстанавливаем только данные формы, но не currentView
        setIsGenerating(savedState.isGenerating)
        setCurrentStep(savedState.currentStep)
        setFormData(savedState.formData)
        setGeneratedText(savedState.generatedText)
        setSelectedPlan(savedState.selectedPlan)
        setIsPaid(savedState.isPaid)
        setPromoCode(savedState.promoCode)
        setPromoDiscount(savedState.promoDiscount)
        setMakePublic(savedState.makePublic)
        setGeneratedMusicUrl(savedState.generatedMusicUrl)
        setSecondMusicUrl(savedState.secondMusicUrl)
        setGeneratedCoverUrl(savedState.generatedCoverUrl)
        setMusicGenerationStep(savedState.musicGenerationStep)
        setIsUpdatingMusic(savedState.isUpdatingMusic)
        setTaskId(savedState.taskId)
        
        // Принудительно устанавливаем landing для главной страницы
        if (window.location.pathname === '/') {
          setCurrentView('landing')
        }
      }
    }

    const checkCalendarEventData = () => {
      try {
        const calendarEventData = localStorage.getItem('calendarEventData')
        if (calendarEventData) {
          const eventData = JSON.parse(calendarEventData)
          console.log('📅 Найдены данные из календаря:', eventData)
          
          // Сохраняем данные для передачи на страницу создания
          localStorage.setItem('calendarEventData', calendarEventData)
          
          console.log('✅ Данные календаря сохранены для передачи на страницу создания')
        }
      } catch (error) {
        console.error('❌ Ошибка обработки данных календаря:', error)
      }
    }

    const checkExampleData = () => {
      try {
        const exampleData = localStorage.getItem('exampleData')
        if (exampleData) {
          const data = JSON.parse(exampleData)
          console.log('🎵 Найдены данные из примера:', data)
          
          // Сохраняем данные для передачи на страницу создания
          localStorage.setItem('exampleData', exampleData)
          
          console.log('✅ Данные примера сохранены для передачи на страницу создания')
        }
      } catch (error) {
        console.error('❌ Ошибка обработки данных примера:', error)
      }
    }

    console.log('🔄 Початок відновлення стану...')
    restoreState()
    checkCalendarEventData()
    checkExampleData()
    console.log('✅ Відновлення стану завершено')
  }, [session])

  // Сохранение состояния (убираем из useCallback чтобы избежать циклов)
  const saveGenerationState = () => {
    const state: GenerationState = {
      isGenerating,
      currentStep,
      formData: memoizedFormData,
      generatedText,
      selectedPlan,
      isPaid,
      promoCode,
      promoDiscount,
      makePublic,
      generatedMusicUrl,
      secondMusicUrl,
      generatedCoverUrl,
      musicGenerationStep,
      isUpdatingMusic,
      taskId
    }
    
    generationService.saveGenerationState(state)
    
    // Также сохраняем активную генерацию
    if (taskId) {
      generationService.setActiveGeneration(taskId)
    }
  }

  // Автосохранение состояния при критических изменениях (убираем лишние зависимости)
  useEffect(() => {
    if (taskId && generatedText) {
      saveGenerationState()
    }
  }, [taskId, generatedText]) // Только критические зависимости

  // Скидання стану генерації при зміні кроку
  useEffect(() => {
    console.log(`📍 Поточний крок: ${currentStep}`)
    
    // Якщо перейшли на крок 3 і текст вже є, скидаємо стан генерації
    if (currentStep === 3 && generatedText && isGenerating) {
      console.log('🔄 Скидання стану генерації при поверненні на крок 3')
      setIsGenerating(false)
    }
  }, [currentStep, generatedText, isGenerating])

  // Управление поздравлениями пользователя (стабільна функція без зайвих залежностей)  
  const upsertGreetingInUserGreetings = useCallback((greeting: Partial<Greeting> & { taskId: string }) => {
    console.log('📋 Додаю/оновлюю привітання в userGreetings:', greeting)
    
    setUserGreetings(prevGreetings => {
      const existingIndex = prevGreetings.findIndex(g => g.taskId === greeting.taskId)
      
      if (existingIndex >= 0) {
        // Обновляем существующее приветствие
        const updatedGreetings = [...prevGreetings]
        updatedGreetings[existingIndex] = {
          ...updatedGreetings[existingIndex],
          ...greeting,
          updatedAt: new Date().toISOString()
        }
        console.log('📋 Оновлено існуюче привітання:', updatedGreetings[existingIndex])
        return updatedGreetings
      } else {
        // Добавляем новое приветствие
        const newGreeting: Greeting = {
          id: greeting.taskId || generateId('greeting'),
          taskId: greeting.taskId,
          recipientName: greeting.recipientName || '',
          occasion: greeting.occasion || '',
          relationship: greeting.relationship || '',
          personalDetails: greeting.personalDetails || '',
          musicStyle: greeting.musicStyle || '',
          mood: greeting.mood || '',
          greetingLanguage: greeting.greetingLanguage || 'uk',
          plan: greeting.plan || 'basic',
          text: greeting.text || '',
          status: greeting.status || 'PENDING',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          musicUrl: greeting.musicUrl || '',
          secondMusicUrl: greeting.secondMusicUrl || '',
          coverUrl: greeting.coverUrl || '',
          allowSharing: greeting.allowSharing || false,
          userId: greeting.userId || 'current-user',
          totalPrice: greeting.plan === 'premium' ? (settings?.premiumPlanPrice || 200) : (settings?.basicPlanPrice || 100),
          paymentMethod: 'liqpay'
        }
        console.log('📋 Додано нове привітання:', newGreeting)
        return [newGreeting, ...prevGreetings]
      }
    })
  }, [settings]) // Убираем setUserGreetings из зависимостей - он стабильный

  // Обновление карточки только при критических изменениях
  useEffect(() => {
    if (taskId && generatedText) {
      // Создаем стабильный объект для избежания лишних перерендеров
             const greetingData = {
        taskId,
        recipientName: memoizedFormData.recipientName,
        occasion: memoizedFormData.occasion,
        relationship: memoizedFormData.relationship,
        personalDetails: memoizedFormData.personalDetails,
        musicStyle: memoizedFormData.musicStyle,
        mood: memoizedFormData.mood,
        greetingLanguage: memoizedFormData.greetingLanguage,
        plan: selectedPlan || 'basic',
        text: generatedText,
        status: (musicGenerationStep === 'complete' ? 'SUCCESS' : 
               musicGenerationStep === 'processing' ? 'FIRST_SUCCESS' :
               musicGenerationStep === 'text-processing' ? 'TEXT_SUCCESS' : 'PENDING') as GenerationStatus,
        musicUrl: generatedMusicUrl,
        secondMusicUrl: secondMusicUrl,
        coverUrl: generatedCoverUrl
      }
      
      upsertGreetingInUserGreetings(greetingData)
    }
  }, [taskId, generatedText]) // Убираем лишние зависимости, которые вызывают циклы

  // Обработчики авторизации и навигации
  const handleCreateClick = () => {
    console.log('🖱️ Кнопка "Створити" натиснута')
    
    if (!session) {
      console.log('🔐 Показую модальне вікно авторизації для створення')
      setAuthModalType('create')
      setShowAuthModal(true)
      return
    }
    
    // Если пользователь авторизован, переходим на страницу создания
    console.log('✅ Користувач авторизований, переходжу на сторінку створення')
    router.push('/create')
  }

  const handleCreateFromExample = (exampleData: {
    recipientName: string
    occasion: string
    relationship: string
    musicStyle: string
    mood: string
    greetingLanguage: string
  }) => {
    console.log('🖱️ Кнопка "Створити схоже" натиснута з даними:', exampleData)
    
    // Сохраняем данные примера в localStorage для передачи на страницу создания
    localStorage.setItem('exampleData', JSON.stringify(exampleData))
    
    // Переходим на страницу создания
    router.push('/create')
  }

  const handleLoginClick = () => {
    setAuthModalType('login')
    setShowAuthModal(true)
  }

  const handleSignOut = async () => {
    await signOut()
    setUserGreetings([])
    setCurrentView('landing')
    resetState()
  }

  const handleAuthModalClose = () => {
    console.log('🔐 Закриття модального вікна авторизації')
    setShowAuthModal(false)
  }



  const handleConsentModalClose = () => {
    console.log('🔐 Закриття модального вікна згод')
    setShowConsentModal(false)
  }

  // Проверка согласий перед любыми действиями
  const checkConsentsBeforeAction = async (): Promise<boolean> => {
    if (!session?.user?.email) {
      return false
    }

    try {
      const response = await fetch('/api/consent/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: session.user.email })
      })

      const data = await response.json()
      
      if (data.success && !data.hasConsents) {
        console.log('⚠️ Користувач не має згод, показую попап згод')
        setShowConsentModal(true)
        return false
      }
      
      return true
    } catch (error) {
      console.error('❌ Помилка перевірки згод:', error)
      return false
    }
  }

  // Генерация текста
  const handleGenerateText = async () => {
    try {
      // Проверяем согласия перед генерацией
      const hasConsents = await checkConsentsBeforeAction()
      if (!hasConsents) {
        return
      }

      // Валидация формы
      const validation = validateFormData(formData)
      if (!validation.isValid) {
        validation.errors.forEach(error => safeToast.error(error))
        return
      }

      setIsGenerating(true)
      console.log('📝 Початок генерації тексту')

      const result = await generationService.generateText(formData)

      if (result.success && result.text) {
        setGeneratedText(result.text)
        safeToast.success('Текст створено успішно!')
        
        // TaskId будет создан на сервере при генерации музыки
        
        console.log('✅ Текст згенеровано, переходжу на крок 2 (попередній перегляд)')
        setCurrentStep(2) // Переходимо на крок 2 (попередній перегляд тексту) після генерації тексту
        setIsGenerating(false) // ✅ Скидаємо стан генерації після успіху
      } else {
        safeToast.error(result.error || 'Помилка генерації тексту')
        setIsGenerating(false)
      }
    } catch (error) {
      console.error('❌ Помилка генерації тексту:', error)
      safeToast.error('Помилка генерації тексту')
      setIsGenerating(false)
    }
  }

  // Повторная генерация текста
  const handleRegenerateText = async () => {
    try {
      // Проверяем согласия перед генерацией
      const hasConsents = await checkConsentsBeforeAction()
      if (!hasConsents) {
        return
      }

      // Валидация формы
      const validation = validateFormData(formData)
      if (!validation.isValid) {
        validation.errors.forEach(error => safeToast.error(error))
        return
      }

      setIsGenerating(true)
      console.log('🔄 Початок повторної генерації тексту')

      const result = await generationService.generateText(formData)

      if (result.success && result.text) {
        setGeneratedText(result.text)
        safeToast.success('Новий варіант тексту створено!')
        setIsGenerating(false)
      } else {
        safeToast.error(result.error || 'Помилка повторної генерації тексту')
        setIsGenerating(false)
      }
    } catch (error) {
      console.error('❌ Помилка повторної генерації тексту:', error)
      safeToast.error('Помилка повторної генерації тексту')
      setIsGenerating(false)
    }
  }

  // Генерация музыки
  const handleGenerateMusic = async () => {
    try {
      // Проверяем согласия перед генерацией
      const hasConsents = await checkConsentsBeforeAction()
      if (!hasConsents) {
        return
      }

      if (!generatedText) {
        safeToast.error('Спочатку згенеруйте текст')
        return
      }

      if (!selectedPlan) {
        safeToast.error('Оберіть план')
        return
      }

      console.log('🎵 Початок генерації музики')
      setIsGenerating(true)
      setMusicGenerationStep('uploading')

      const result = await generationService.generateMusic(generatedText, formData)

      if (result.success && result.taskId) {
        // Используем taskId из ответа сервера, а не локальный
        const finalTaskId = result.taskId
        setTaskId(finalTaskId)
        setMusicGenerationStep('text-processing')
        
        // Запускаем отслеживание статуса через SSE
        generationService.startSSEConnection(
          finalTaskId,
          (status, data) => {
            console.log('📡 Оновлення статусу:', status)
            
            const newStep = generationService.getStepFromStatus(status)
            setMusicGenerationStep(newStep)
            
            generationService.showStatusNotification(status)
            
            // Обновляем данные если они есть
            if (data) {
              if (data.text) setGeneratedText(data.text)
              if (data.musicUrl) setGeneratedMusicUrl(data.musicUrl)
              if (data.secondMusicUrl) setSecondMusicUrl(data.secondMusicUrl)
              if (data.coverUrl) setGeneratedCoverUrl(data.coverUrl)
            }
          },
          (data) => {
            console.log('✅ Генерація завершена:', data)
            setMusicGenerationStep('complete')
            setIsGenerating(false)
            setCurrentStep(2)
            
            // Очищаем активную генерацию
            generationService.setActiveGeneration(null)
            
            // НЕ делаем редирект - остаемся на странице /greeting/[taskId]
            // Страница /greeting/[taskId] уже показывает красивый результат
            console.log('✅ Генерація завершена, залишаємось на поточній сторінці')
          },
          (error) => {
            console.error('❌ Помилка генерації:', error)
            safeToast.error(error)
            setIsGenerating(false)
            setMusicGenerationStep('uploading')
            
            // Очищаем состояние при ошибке
            generationService.clearGenerationState()
          }
        )

        // Переходимо на сторінку привітання, де відбувається генерація
        console.log('🎵 Генерація музики запущена, перенаправляємо на сторінку привітання')
        router.push(`/greeting/${finalTaskId}`)
        
      } else {
        safeToast.error(result.error || 'Помилка генерації музики')
        setIsGenerating(false)
      }
    } catch (error) {
      console.error('❌ Помилка генерації музики:', error)
      safeToast.error('Помилка генерації музики')
      setIsGenerating(false)
    }
  }

  // Мемоізуємо formData для уникнення постійного перестворення
  const memoizedFormData = useMemo(() => formData, [
    formData.recipientName,
    formData.occasion,
    formData.relationship,
    formData.personalDetails,
    formData.musicStyle,
    formData.mood,
    formData.greetingLanguage,
    formData.voiceType,
    formData.useStarStyle,
    formData.artistStyle,
    formData.isCustomOccasion
  ])

  // Обработчики форм
  const handleFormDataChange = useCallback((newFormData: FormData) => {
    setFormData(newFormData)
  }, [])

  const handlePlanSelect = useCallback((plan: Plan) => {
    setSelectedPlan(plan)
  }, [])

  const handlePromoCodeChange = useCallback((code: string, discount: number) => {
    setPromoCode(code)
    setPromoDiscount(discount)
  }, [])

  // Обробник промокодів
  const handleApplyPromo = useCallback(async () => {
    // Проверяем согласия перед применением промокода
    const hasConsents = await checkConsentsBeforeAction()
    if (!hasConsents) {
      return
    }

    setPromoError('')
    
    if (!promoCode.trim()) {
      setPromoError('Введіть промокод')
      return
    }

    try {
      // Валідуємо промокод через API
      const response = await fetch('/api/promocodes/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: promoCode.trim() })
      })

      const result = await response.json()

      if (result.valid) {
        setPromoDiscount(result.discount)
        setPromoError('')
        safeToast.success(`Знижка ${result.discount}% застосована!`)
      } else {
        setPromoError(result.error || 'Невірний промокод')
        setPromoDiscount(0)
        safeToast.error(result.error || 'Невірний промокод')
      }
    } catch (error) {
      console.error('Помилка перевірки промокода:', error)
      setPromoError('Помилка перевірки промокода')
      setPromoDiscount(0)
      safeToast.error('Помилка перевірки промокода')
    }
  }, [promoCode, checkConsentsBeforeAction])

  // Обробник відкриття модалки оплати
  const handlePayment = useCallback(async () => {
    // Проверяем согласия перед оплатой
    const hasConsents = await checkConsentsBeforeAction()
    if (!hasConsents) {
      return
    }

    if (!selectedPlan) {
      safeToast.error('Оберіть тарифний план')
      return
    }

    if (!generatedText) {
      safeToast.error('Спочатку згенеруйте текст')
      return
    }

    setShowPaymentModal(true)
  }, [selectedPlan, generatedText, checkConsentsBeforeAction])

  // Обробник підтвердження оплати
  const handlePaymentConfirm = useCallback(async () => {
    try {
      console.log('💳 Початок процесу оплати')
      
      // Якщо використовується промокод, відмічаємо його як використаний
      if (promoCode && promoDiscount > 0) {
        try {
          await fetch('/api/promocodes/use', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              code: promoCode,
              orderId: `order_${Date.now()}_${Math.random().toString(36).substring(7)}`
            })
          })
          console.log(`✅ Промокод ${promoCode} відмічено як використаний`)
        } catch (error) {
          console.error('⚠️ Помилка відмітки промокода як використаного:', error)
          // Не перериваємо процес оплати через помилку з промокодом
        }
      }
      
      // Позначаємо як оплачено (в реальному додатку тут буде API оплати)
      setIsPaid(true)
      setShowPaymentModal(false)
      safeToast.success('Оплата успішна! Починаємо створення музики...')
      
      // Запускаємо генерацію музики
      await handleGenerateMusic()
      
    } catch (error) {
      console.error('❌ Помилка оплати:', error)
      safeToast.error('Помилка оплати. Спробуйте ще раз.')
    }
  }, [handleGenerateMusic, promoCode, promoDiscount])

  // Скидання форми та стану генерації (без зміни view)
  const resetFormAndGeneration = useCallback(() => {
    console.log('🧹 Скидання форми та стану генерації...')
    
    setIsGenerating(false)
    setCurrentStep(1)
    setGeneratedText('')
    setSelectedPlan(null)
    setIsPaid(false)
    setPromoCode('')
    setPromoDiscount(0)
    setPromoError('')
    setIsEditingText(false)
    setMakePublic(false)
    setGeneratedMusicUrl('')
    setSecondMusicUrl('')
    setGeneratedCoverUrl('')
    setMusicGenerationStep('uploading')
    setIsUpdatingMusic(false)
    setTaskId(null)
    setShowPaymentModal(false) // Закриваємо модалку оплати
    
    // Повне скидання форми
    setFormData({
      recipientName: '',
      occasion: '',
      relationship: '',
      personalDetails: '',
      musicStyle: '',
      mood: '',
      greetingLanguage: isRussianBrowser ? 'ru' : 'uk',
      voiceType: 'female',
      useStarStyle: false,
      artistStyle: '',
      isCustomOccasion: false
    })
    
    // Очищаем состояние в сервисе
    generationService.clearGenerationState()
    
    console.log('✅ Форма та стан генерації скинуто')
  }, [])

  // Повне скидання стану (з поверненням на головну)
  const resetState = useCallback(() => {
    console.log('🧹 Повне скидання стану додатку...')
    
    resetFormAndGeneration()
    setCurrentView('landing') // Повертаємось на головну
    setShowAuthModal(false) // Закриваємо модалку авторизації
    
    console.log('✅ Стан додатку повністю скинуто')
  }, [resetFormAndGeneration])

  // Безопасные функции для рендера
  const safeText = (value: any): string => safeString(value)
  const safeValue = (value: any): string => safeString(value)

  // Рендер страниц в зависимости от текущего состояния
  const renderCurrentView = () => {
    console.log('🎨 Рендер currentView:', currentView)
    switch (currentView) {
      case 'landing':
        return (
          <LandingPage
            session={session}
            onCreateClick={handleCreateClick}
            onLoginClick={handleLoginClick}
            onSignOut={handleSignOut}
            onExamplesClick={() => setCurrentView('examples')}
            onDashboardClick={() => setCurrentView('dashboard')}
          />
        )
      
      case 'service':
        return (
          <ServicePage
            session={session}
            currentStep={currentStep}
            formData={formData}
            setFormData={setFormData}
            generatedText={safeText(generatedText)}
            setGeneratedText={setGeneratedText}
            isGenerating={isGenerating}
            selectedPlan={selectedPlan}
            setSelectedPlan={setSelectedPlan}
            promoCode={promoCode}
            setPromoCode={setPromoCode}
            promoDiscount={promoDiscount}
            promoError={promoError}
            isEditingText={isEditingText}
            setIsEditingText={setIsEditingText}
            onBack={() => setCurrentView('landing')}
            onNextStep={async () => {
              // Проверяем согласия перед переходом на следующий шаг
              const hasConsents = await checkConsentsBeforeAction()
              if (!hasConsents) {
                return
              }
              
              console.log(`🔄 Перехід з кроку ${currentStep} на крок ${currentStep + 1}`)
              setCurrentStep(prev => prev + 1)
            }}
            onPrevStep={() => {
              setCurrentStep(prev => prev - 1)
              // Скидаємо стани при поверненні назад
              setIsGenerating(false)
              setPromoError('')
            }}
            onGenerateText={handleGenerateText}
            onRegenerateText={handleRegenerateText}
            onApplyPromo={handleApplyPromo}
            onPayment={handlePayment}
          />
        )
      
      case 'result':
        return (
          <ResultPage
            session={session}
            formData={formData}
            generatedText={safeText(generatedText)}
            generatedMusicUrl={safeValue(generatedMusicUrl)}
            generatedCoverUrl={safeValue(generatedCoverUrl)}
            selectedPlan={selectedPlan}
            onBack={() => setCurrentView('landing')}
            onDashboard={() => setCurrentView('dashboard')}
            onCreateAnother={() => {
              resetFormAndGeneration()
              setCurrentView('service')
            }}
            secondMusicUrl={safeValue(secondMusicUrl)}
            isUpdatingMusic={isUpdatingMusic}
            onMusicUpdate={(newUrl) => setGeneratedMusicUrl(newUrl)}
          />
        )
      
      case 'dashboard':
        // Возвращаем null, навигация будет выполнена в useEffect
        return null
      
      case 'examples':
        return (
          <ExamplesPage
            session={session}
            onBack={() => setCurrentView('landing')}
            onCreateClick={handleCreateClick}
            onLoginClick={handleLoginClick}
            onSignOut={handleSignOut}
            onCreateFromExample={handleCreateFromExample}
          />
        )
      
      default:
        return (
          <LandingPage 
            session={session} 
            onCreateClick={handleCreateClick} 
            onLoginClick={handleLoginClick} 
            onSignOut={handleSignOut}
            onExamplesClick={() => setCurrentView('examples')}
            onDashboardClick={() => setCurrentView('dashboard')}
          />
        )
    }
  }

  // useEffect для навигации на дашборд
  useEffect(() => {
    if (currentView === 'dashboard') {
      router.push('/dashboard')
    }
  }, [currentView, router])

  return (
    <>
      {/* Показываем загрузку при проверке сессии */}
      {status === 'loading' && (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-pink-600 to-indigo-800">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white">Завантаження...</p>
          </div>
        </div>
      )}
      
      {/* Показываем основной контент если нет загрузки */}
      {status !== 'loading' && (
        <>
          {renderCurrentView()}
          
          {showAuthModal && (
            <AuthModal
              isOpen={showAuthModal}
              onClose={handleAuthModalClose}
              showContinueWithoutAuth={authModalType === 'create'}
            />
          )}
          
          {showPaymentModal && selectedPlan && (
            <FondyModal
              isOpen={showPaymentModal}
              onClose={() => setShowPaymentModal(false)}
              onSuccess={handlePaymentConfirm}
              amount={selectedPlan === 'basic' ? (settings?.basicPlanPrice || 100) : (settings?.premiumPlanPrice || 200)}
              plan={selectedPlan}
              promoDiscount={promoDiscount}
            />
          )}
          
          {showConsentModal && (
            <ConsentModal
              isOpen={showConsentModal}
              onClose={handleConsentModalClose}
            />
          )}
        </>
      )}
    </>
  )
} 