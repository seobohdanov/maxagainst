'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ServicePage } from '@/components/pages/ServicePage'
import ConsentModal from '@/components/modals/ConsentModal'
import { PaymentModal } from '@/components/modals/PaymentModal'
import { useAppSettings } from '@/hooks/useAppSettings'
import { useBrowserLanguage } from '@/hooks/useBrowserLanguage'
import type { FormData, Plan } from '@/types'
import { generationService } from '@/services/generationService'
import { safeToast } from '@/lib/toast'

export default function CreatePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { settings } = useAppSettings()
  const { isRussianBrowser } = useBrowserLanguage()
  
  // Состояние формы
  const [currentStep, setCurrentStep] = useState(1)
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
    artistStyle: '',
    isCustomOccasion: false
  })
  
  // Загружаем данные из примера и календаря при инициализации
  useEffect(() => {
    // Загружаем данные из примера
    const exampleData = localStorage.getItem('exampleData')
    if (exampleData) {
      try {
        const data = JSON.parse(exampleData)
        setFormData(prev => ({
          ...prev,
          occasion: data.occasion || '',
          relationship: data.relationship || '',
          musicStyle: data.musicStyle || '',
          mood: data.mood || '',
          greetingLanguage: data.greetingLanguage || (isRussianBrowser ? 'ru' : 'uk')
        }))
        // Очищаем данные примера
        localStorage.removeItem('exampleData')
      } catch (error) {
        console.error('Помилка завантаження даних прикладу:', error)
      }
    }

    // Загружаем данные из календаря
    const calendarEventData = localStorage.getItem('calendarEventData')
    if (calendarEventData) {
      try {
        const eventData = JSON.parse(calendarEventData)
        setFormData(prev => ({
          ...prev,
          recipientName: eventData.recipientName || '',
          occasion: eventData.occasion || '',
          relationship: eventData.relationship || '',
          isCustomOccasion: eventData.isCustomOccasion || false
        }))
        // Очищаем данные календаря
        localStorage.removeItem('calendarEventData')
      } catch (error) {
        console.error('Помилка завантаження даних календаря:', error)
      }
    }
  }, [isRussianBrowser])
  
  // Состояние генерации
  const [generatedText, setGeneratedText] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  
  // Состояние планов
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  
  // Состояние промокода
  const [promoCode, setPromoCode] = useState('')
  const [promoDiscount, setPromoDiscount] = useState(0)
  const [promoError, setPromoError] = useState('')
  const [isEditingText, setIsEditingText] = useState(false)
  
  // Состояние модальных окон
  const [showConsentModal, setShowConsentModal] = useState(false)
  const [hasConsents, setHasConsents] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)

  // Проверка согласий при загрузке страницы
  useEffect(() => {
    if (session?.user?.email && status === 'authenticated') {
      checkUserConsentsOnLoad(session.user.email)
    }
  }, [session, status])

  const checkUserConsentsOnLoad = async (email: string) => {
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
          setHasConsents(false)
        } else {
          console.log('✅ Користувач має всі необхідні згоди')
          setHasConsents(true)
        }
      }
    } catch (error) {
      console.error('❌ Помилка перевірки згод:', error)
    }
  }

  const handleConsentModalClose = () => {
    setShowConsentModal(false)
    setHasConsents(true) // <-- Считаем, что согласия теперь точно есть
  }

  // Проверка согласий перед любыми действиями
  const checkConsentsBeforeAction = async (): Promise<boolean> => {
    if (!session?.user?.email) {
      return false
    }
    if (hasConsents) {
      return true
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
        setHasConsents(false)
        return false
      }
      setHasConsents(true)
      return true
    } catch (error) {
      console.error('❌ Помилка перевірки згод:', error)
      return false
    }
  }

  const handleBack = () => {
    router.push('/')
  }

  const handleNextStep = async () => {
    // Проверяем согласия перед переходом на следующий шаг
    const hasConsents = await checkConsentsBeforeAction()
    if (!hasConsents) {
      return
    }
    
    console.log(`🔄 Перехід з кроку ${currentStep} на крок ${currentStep + 1}`)
    setCurrentStep(prev => prev + 1)
  }

  const handlePrevStep = () => {
    setCurrentStep(prev => prev - 1)
    // Скидаємо стани при поверненні назад
    setIsGenerating(false)
    setPromoError('')
  }

  const handleGenerateText = async () => {
    // Проверяем согласия перед генерацией
    const hasConsents = await checkConsentsBeforeAction()
    if (!hasConsents) {
      return
    }

    // Валидация формы
    if (!formData.recipientName || !formData.occasion || !formData.relationship) {
      safeToast.error('Заповніть всі обов\'язкові поля')
      return
    }

    setIsGenerating(true)
    console.log('🎵 Генерація тексту...')

    try {
      const result = await generationService.generateText(formData)

      if (result.success && result.text) {
        setGeneratedText(result.text)
        safeToast.success('Текст створено успішно!')
        console.log('✅ Текст згенеровано успішно')
        // НЕ переходим на следующий шаг - остаемся на Кроке 2 для просмотра и редактирования
        // setCurrentStep(prev => prev + 1)
      } else {
        safeToast.error(result.error || 'Помилка генерації тексту')
      }
    } catch (error) {
      console.error('❌ Помилка генерації тексту:', error)
      safeToast.error('Помилка генерації тексту')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleRegenerateText = async () => {
    // Проверяем согласия перед регенерацией
    const hasConsents = await checkConsentsBeforeAction()
    if (!hasConsents) {
      return
    }

    setIsGenerating(true)
    console.log('🔄 Регенерація тексту...')

    try {
      const result = await generationService.generateText(formData)

      if (result.success && result.text) {
        setGeneratedText(result.text)
        safeToast.success('Новий варіант тексту створено!')
        console.log('✅ Текст регенеровано успішно')
      } else {
        safeToast.error(result.error || 'Помилка регенерації тексту')
      }
    } catch (error) {
      console.error('❌ Помилка регенерації тексту:', error)
      safeToast.error('Помилка регенерації тексту')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleApplyPromo = async () => {
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

    console.log('🎫 Застосування промокоду...')

    try {
      const response = await fetch('/api/promocodes/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: promoCode })
      })

      const data = await response.json()

      if (data.success) {
        setPromoDiscount(data.discount || 0)
        setPromoError('')
        safeToast.success('Промокод застосовано успішно!')
        console.log('✅ Промокод застосовано успішно')
      } else {
        setPromoDiscount(0)
        setPromoError(data.error || 'Невірний промокод')
        console.error('❌ Помилка застосування промокоду:', data.error)
      }
    } catch (error) {
      console.error('❌ Помилка застосування промокоду:', error)
      setPromoError('Помилка застосування промокоду')
    }
  }

  const handlePayment = async () => {
    // Проверяем согласия перед оплатой
    const hasConsents = await checkConsentsBeforeAction()
    if (!hasConsents) {
      return
    }

    if (!selectedPlan) {
      safeToast.error('Оберіть тариф')
      return
    }

    console.log('💳 Показую модалку оплати...')
    setShowPaymentModal(true)
  }

  const handlePaymentConfirm = async () => {
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
      setShowPaymentModal(false)
      safeToast.success('Оплата успішна! Починаємо створення музики...')
      
      // Запускаємо генерацію музики
      console.log('🎵 Початок генерації музики')
      setIsGenerating(true)

      const result = await generationService.generateMusic(generatedText, formData)

      if (result.success && result.taskId) {
        // Используем taskId из ответа сервера
        const finalTaskId = result.taskId
        console.log('✅ Завдання генерації музики створено:', finalTaskId)
        
        // Переходимо на сторінку привітання, де відбувається генерація
        console.log('🎵 Генерація музики запущена, перенаправляємо на сторінку привітання')
        router.push(`/greeting/${finalTaskId}`)
        
      } else {
        safeToast.error(result.error || 'Помилка генерації музики')
        setIsGenerating(false)
      }
      
    } catch (error) {
      console.error('❌ Помилка оплати:', error)
      safeToast.error('Помилка оплати. Спробуйте ще раз.')
      setIsGenerating(false)
    }
  }

  // Показываем загрузку при проверке сессии
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-pink-600 to-indigo-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Завантаження...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <ServicePage
        session={session}
        currentStep={currentStep}
        formData={formData}
        setFormData={setFormData}
        generatedText={generatedText}
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
        onBack={handleBack}
        onNextStep={handleNextStep}
        onPrevStep={handlePrevStep}
        onGenerateText={handleGenerateText}
        onRegenerateText={handleRegenerateText}
        onApplyPromo={handleApplyPromo}
        onPayment={handlePayment}
      />
      
      {/* Consent Modal */}
      {showConsentModal && (
        <ConsentModal
          isOpen={showConsentModal}
          onClose={handleConsentModalClose}
        />
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedPlan && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onPayment={handlePaymentConfirm}
          plan={selectedPlan}
          promoDiscount={promoDiscount}
        />
      )}
    </>
  )
} 