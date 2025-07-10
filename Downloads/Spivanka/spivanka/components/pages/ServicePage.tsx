'use client'

import React, { useState } from 'react'
import { Session } from 'next-auth'
import { FormData } from '@/types'
import { ArrowLeft, Check, Star, Music, Sparkles } from 'lucide-react'
import { useAppSettings } from '@/hooks/useAppSettings'
import { useBrowserLanguage } from '@/hooks/useBrowserLanguage'
import Header from '@/components/Header'


interface ServicePageProps {
  session: Session | null
  currentStep: number
  formData: FormData
  setFormData: (data: FormData) => void
  generatedText: string
  setGeneratedText: (text: string) => void
  isGenerating: boolean
  selectedPlan: 'basic' | 'premium' | null
  setSelectedPlan: (plan: 'basic' | 'premium' | null) => void
  promoCode: string
  setPromoCode: (code: string) => void
  promoDiscount: number
  promoError: string
  isEditingText: boolean
  setIsEditingText: (editing: boolean) => void
  onBack: () => void
  onNextStep: () => void
  onPrevStep: () => void
  onGenerateText: () => void
  onRegenerateText: () => void
  onApplyPromo: () => void
  onPayment: () => void
}

export const ServicePage: React.FC<ServicePageProps> = ({
  session,
  currentStep,
  formData,
  setFormData,
  generatedText,
  setGeneratedText,
  isGenerating,
  selectedPlan,
  setSelectedPlan,
  promoCode,
  setPromoCode,
  promoDiscount,
  promoError,
  isEditingText,
  setIsEditingText,
  onBack,
  onNextStep,
  onPrevStep,
  onGenerateText,
  onRegenerateText,
  onApplyPromo,
  onPayment
}) => {
  const { settings } = useAppSettings()
  const { isRussianBrowser } = useBrowserLanguage()

  // Если русский язык выбран, но браузер не русский, переключаем на украинский
  React.useEffect(() => {
    if (formData.greetingLanguage === 'ru' && !isRussianBrowser) {
      setFormData({ ...formData, greetingLanguage: 'uk' })
    }
  }, [isRussianBrowser, formData.greetingLanguage, setFormData])





  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-600 to-indigo-800">
      {/* Header */}
      <Header 
        session={session}
        showBackButton={true}
        backButtonText="Головна"
        onBackClick={onBack}
        pageTitle="🎵 Створення привітання"
        variant="minimal"
      />
      
      <div className="max-w-4xl mx-auto p-6">
        {/* Navigation */}
        <nav className="mb-8">
          
          {/* Progress indicator - теперь 3 шага */}
          <div className="flex items-center justify-center mb-8 px-4">
            <div className="flex items-center space-x-2 sm:space-x-4">
              {[1, 2, 3].map(step => (
                <div key={step} className="flex items-center">
                  <button
                    onClick={() => {
                      if (step <= currentStep) {
                        // Handle step navigation
                      }
                    }}
                    disabled={step > currentStep}
                    className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold transition-all ${
                      step <= currentStep 
                        ? 'bg-pink-500 text-white hover:bg-pink-600 cursor-pointer' 
                        : 'bg-white/20 text-white/60 cursor-not-allowed'
                    }`}
                  >
                    {step}
                  </button>
                  {step < 3 && (
                    <div className={`w-4 sm:w-8 h-1 mx-1 sm:mx-2 ${
                      step < currentStep ? 'bg-pink-500' : 'bg-white/20'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </nav>

        {/* Content */}
        <div className="bg-white rounded-3xl shadow-2xl p-8">

          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-3xl font-bold text-gray-800 mb-2">
                  Крок 1: Інформація про привітання
                </h2>
                <p className="text-gray-600">
                  Розкажіть нам про людину та оберіть стиль музики
                </p>
              </div>

              {/* Основная форма в компактном виде */}
              <div className="space-y-6">
                {/* Информация о получателе - компактная сетка */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ім'я отримувача *
                    </label>
                    <input
                      type="text"
                      value={formData.recipientName}
                      onChange={(e) => setFormData({...formData, recipientName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm"
                      placeholder="Наприклад: Марія"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Привід *
                    </label>
                    <div className="space-y-1">
                      {formData.isCustomOccasion ? (
                        <input
                          type="text"
                          value={formData.occasion}
                          onChange={(e) => setFormData({...formData, occasion: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm"
                          placeholder="Введіть назву події"
                          required
                        />
                      ) : (
                        <select
                          value={formData.occasion}
                          onChange={(e) => setFormData({...formData, occasion: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm"
                          required
                        >
                          <option value="">Оберіть привід</option>
                          <option value="День народження">День народження</option>
                          <option value="Весілля">Весілля</option>
                          <option value="Ювілей">Ювілей</option>
                          <option value="Новий рік">Новий рік</option>
                          <option value="Річниця">Річниця</option>
                          <option value="Випускний">Випускний</option>
                          <option value="Хрестини">Хрестини</option>
                          <option value="Інше">Інше</option>
                        </select>
                      )}
                      
                      <div className="flex items-center space-x-2 mt-1">
                        <input
                          type="checkbox"
                          id="customOccasion"
                          checked={formData.isCustomOccasion || false}
                          onChange={(e) => setFormData({
                            ...formData, 
                            isCustomOccasion: e.target.checked,
                            occasion: e.target.checked ? formData.occasion : ''
                          })}
                          className="w-4 h-4 text-pink-600 bg-gray-100 border-gray-300 rounded focus:ring-pink-500 focus:ring-2"
                        />
                        <label htmlFor="customOccasion" className="text-sm text-gray-600">
                          Своя подія
                        </label>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ваші стосунки *
                    </label>
                    <select
                      value={formData.relationship}
                      onChange={(e) => setFormData({...formData, relationship: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm"
                      required
                    >
                      <option value="">Оберіть стосунки</option>
                      <option value="Мама">Мама</option>
                      <option value="Тато">Тато</option>
                      <option value="Дружина">Дружина</option>
                      <option value="Чоловік">Чоловік</option>
                      <option value="Син">Син</option>
                      <option value="Дочка">Дочка</option>
                      <option value="Брат">Брат</option>
                      <option value="Сестра">Сестра</option>
                      <option value="Друг">Друг</option>
                      <option value="Подруга">Подруга</option>
                      <option value="Колега">Колега</option>
                      <option value="Інше">Інше</option>
                    </select>
                  </div>
                </div>

                {/* Вторая строка - язык и голос */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Мова привітання *
                    </label>
                    <select
                      value={formData.greetingLanguage}
                      onChange={(e) => setFormData({...formData, greetingLanguage: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm"
                      required
                    >
                      <option value="uk">Українська</option>
                      {isRussianBrowser && <option value="ru">Русский</option>}
                      <option value="en">English</option>
                      <option value="pl">Polski</option>
                      <option value="de">Deutsch</option>
                      <option value="cz">Čeština</option>
                      <option value="ro">Română</option>
                      <option value="sk">Slovenčina</option>
                      <option value="hu">Magyar</option>
                      <option value="it">Italiano</option>
                      <option value="fr">Français</option>
                      <option value="hr">Hrvatski</option>
                      <option value="pt">Português</option>
                      <option value="es">Español</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Тип голосу *
                    </label>
                    <select
                      value={formData.voiceType || 'female'}
                      onChange={(e) => setFormData({...formData, voiceType: e.target.value as 'female' | 'male' | 'duet'})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm"
                      required
                    >
                      <option value="female">Жіночий голос</option>
                      <option value="male">Чоловічий голос</option>
                      <option value="duet">Дуэт (чоловік + жінка)</option>
                    </select>
                  </div>
                </div>

                {/* Третья строка - настроение и стиль */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Настрій *
                    </label>
                    <select
                      value={formData.mood}
                      onChange={(e) => setFormData({...formData, mood: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm"
                      required
                    >
                      <option value="">Оберіть настрій</option>
                      <option value="joyful">Радісний</option>
                      <option value="tender">Ніжний</option>
                      <option value="solemn">Урочистий</option>
                      <option value="energetic">Енергійний</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <input
                        type="checkbox"
                        id="useStarStyle"
                        checked={formData.useStarStyle || false}
                        onChange={(e) => setFormData({...formData, useStarStyle: e.target.checked, musicStyle: '', artistStyle: ''})}
                        className="w-4 h-4 text-pink-600 bg-gray-100 border-gray-300 rounded focus:ring-pink-500 focus:ring-2"
                      />
                      <label htmlFor="useStarStyle" className="text-sm font-medium text-gray-700">
                        🌟 Стиль зірок музики
                      </label>
                    </div>
                    
                    {!formData.useStarStyle ? (
                      <select
                        value={formData.musicStyle}
                        onChange={(e) => setFormData({...formData, musicStyle: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm"
                        required
                      >
                        <option value="">Оберіть стиль</option>
                        <option value="pop">Pop</option>
                        <option value="rock">Rock</option>
                        <option value="ballad">Ballad</option>
                        <option value="folk">Folk</option>
                        <option value="jazz">Jazz</option>
                        <option value="country">Country</option>
                        <option value="electronic">Electronic</option>
                        <option value="reggae">Reggae</option>
                        <option value="blues">Blues</option>
                        <option value="funk">Funk</option>
                      </select>
                    ) : (
                      <select
                        value={formData.artistStyle || ''}
                        onChange={(e) => setFormData({...formData, artistStyle: e.target.value, musicStyle: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm"
                        required
                      >
                        <option value="">Оберіть виконавця</option>
                        
                        {/* Украинские артисты */}
                        <optgroup label="🇺🇦 Українські">
                          <option value="okean_elzy">Океан Ельзи</option>
                          <option value="jamala">Джамала</option>
                          <option value="tina_karol">Тіна Кароль</option>
                        </optgroup>
                        
                        {/* Международные поп-артисты */}
                        <optgroup label="🎤 Поп">
                          <option value="taylor_swift">Taylor Swift</option>
                          <option value="ed_sheeran">Ed Sheeran</option>
                          <option value="adele">Adele</option>
                          <option value="billie_eilish">Billie Eilish</option>
                          <option value="bruno_mars">Bruno Mars</option>
                          <option value="dua_lipa">Dua Lipa</option>
                        </optgroup>
                        
                        {/* Рок артисты */}
                        <optgroup label="🎸 Рок">
                          <option value="coldplay">Coldplay</option>
                          <option value="imagine_dragons">Imagine Dragons</option>
                          <option value="queen">Queen</option>
                        </optgroup>
                        
                        {/* R&B и Soul */}
                        <optgroup label="🎵 R&B/Soul">
                          <option value="beyonce">Beyoncé</option>
                          <option value="john_legend">John Legend</option>
                          <option value="alicia_keys">Alicia Keys</option>
                        </optgroup>
                        
                        {/* Классика и джаз */}
                        <optgroup label="🎹 Джаз">
                          <option value="frank_sinatra">Frank Sinatra</option>
                          <option value="ella_fitzgerald">Ella Fitzgerald</option>
                        </optgroup>
                      </select>
                    )}
                  </div>
                </div>

                {/* Персональные детали - свернутый блок */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Персональні деталі (необов'язково)
                  </label>
                  <textarea
                    value={formData.personalDetails}
                    onChange={(e) => setFormData({...formData, personalDetails: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm"
                    rows={2}
                    placeholder="Хобі, досягнення, що любить..."
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  onClick={onNextStep}
                  disabled={!formData.recipientName || !formData.occasion || !formData.relationship || !(formData.useStarStyle ? formData.artistStyle : formData.musicStyle) || !formData.mood || !formData.voiceType}
                  className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-8 py-3 rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Далі →
                </button>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-800 mb-4">
                  Крок 2: Генерація тексту
                </h2>
                <p className="text-gray-600">
                  Створимо персональний текст привітання на основі ваших даних
                </p>
              </div>

              {!generatedText ? (
                <div className="text-center space-y-6">
                  <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl p-6">
                    <h3 className="font-bold text-gray-800 mb-4">Підготовлений запит:</h3>
                    <div className="space-y-2 text-sm text-gray-600 text-left">
                      <p><strong>Для кого:</strong> {formData.recipientName}</p>
                      <p><strong>Привід:</strong> {formData.occasion}</p>
                      <p><strong>Стосунки:</strong> {formData.relationship}</p>
                      <p><strong>Стиль:</strong> {formData.musicStyle}</p>
                      <p><strong>Настрій:</strong> {formData.mood}</p>
                      <p><strong>Мова:</strong> {formData.greetingLanguage === 'uk' ? 'Українська' : formData.greetingLanguage === 'ru' ? 'Русский' : formData.greetingLanguage}</p>
                      {formData.personalDetails && (
                        <p><strong>Персональні деталі:</strong> {formData.personalDetails}</p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={onGenerateText}
                    disabled={isGenerating}
                    className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-8 py-4 rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                  >
                    {isGenerating ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Створюємо текст...
                      </div>
                    ) : (
                      '🎵 Створити текст привітання'
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-gray-800">Згенерований текст:</h3>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={onRegenerateText}
                          disabled={isGenerating}
                          className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center gap-2"
                        >
                          {isGenerating ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              Генеруємо...
                            </>
                          ) : (
                            <>
                              🔄 Ще варіант
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => setIsEditingText(!isEditingText)}
                          className="text-pink-600 hover:text-pink-700 text-sm font-medium"
                        >
                          {isEditingText ? 'Зберегти' : 'Редагувати'}
                        </button>
                      </div>
                    </div>
                    
                    {isEditingText ? (
                      <textarea
                        value={generatedText}
                        onChange={(e) => setGeneratedText(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                        rows={12}
                      />
                    ) : (
                      <div className="bg-gray-50 rounded-xl p-6 whitespace-pre-wrap text-gray-800">
                        {generatedText}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between pt-6">
                    <button
                      onClick={onPrevStep}
                      className="bg-gray-300 text-gray-700 px-8 py-3 rounded-xl font-bold hover:bg-gray-400 transition-all"
                    >
                      ← Назад
                    </button>
                    <button
                      onClick={onNextStep}
                      disabled={!generatedText}
                      className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-8 py-3 rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Далі →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-800 mb-4">
                  Крок 3: Вибір тарифу та оплата
                </h2>
                <p className="text-gray-600">
                  Оберіть тариф та завершіть замовлення
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className={`border-2 rounded-xl p-6 cursor-pointer transition-all ${
                  selectedPlan === 'basic' ? 'border-pink-500 bg-pink-50' : 'border-gray-200 hover:border-pink-300'
                }`}>
                  <div className="text-center">
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Базовий</h3>
                    <div className="text-3xl font-bold text-gray-800 mb-4">{settings?.basicPlanPrice || 100}₴</div>
                    <ul className="text-gray-600 mb-6 space-y-2">
                      <li>✓ Персональний текст</li>
                      <li>✓ Музична композиція (~2 хв)</li>
                      <li>✓ Базова обкладинка</li>
                      <li>✓ MP3 файл</li>
                    </ul>
                    <button
                      onClick={() => setSelectedPlan('basic')}
                      className={`w-full py-3 rounded-xl font-bold transition-all ${
                        selectedPlan === 'basic' 
                          ? 'bg-pink-500 text-white' 
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {selectedPlan === 'basic' ? 'Обрано' : 'Обрати'}
                    </button>
                  </div>
                </div>

                <div className={`border-2 rounded-xl p-6 cursor-pointer transition-all ${
                  selectedPlan === 'premium' ? 'border-yellow-500 bg-yellow-50' : 'border-gray-200 hover:border-yellow-300'
                }`}>
                  <div className="text-center">
                    <div className="bg-yellow-400 text-gray-900 px-3 py-1 rounded-full text-sm font-bold mb-4 inline-block">
                      ПОПУЛЯРНИЙ
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Преміум</h3>
                    <div className="text-3xl font-bold text-gray-800 mb-4">{settings?.premiumPlanPrice || 200}₴</div>
                    <ul className="text-gray-600 mb-6 space-y-2">
                      <li>✓ Все з базового</li>
                      <li>✓ Унікальна обкладинка з AI</li>
                      <li>✓ Додаткові музичні варіанти</li>
                      <li>✓ Високоякісний MP3</li>
                      <li>✓ Пріоритетна підтримка</li>
                    </ul>
                    <button
                      onClick={() => setSelectedPlan('premium')}
                      className={`w-full py-3 rounded-xl font-bold transition-all ${
                        selectedPlan === 'premium' 
                          ? 'bg-yellow-500 text-gray-900' 
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {selectedPlan === 'premium' ? 'Обрано' : 'Обрати'}
                    </button>
                  </div>
                </div>
              </div>

              {selectedPlan && (
                <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl p-6">
                  <h3 className="font-bold text-gray-800 mb-4">Промокод (необов'язково):</h3>
                  <div className="flex gap-4">
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                      placeholder="Введіть промокод"
                    />
                    <button
                      onClick={onApplyPromo}
                      className="bg-gray-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-700 transition-all"
                    >
                      Застосувати
                    </button>
                  </div>
                  {promoError && (
                    <p className="text-red-600 text-sm mt-2">{promoError}</p>
                  )}
                  {promoDiscount > 0 && (
                    <p className="text-green-600 text-sm mt-2">Знижка {promoDiscount}% застосована!</p>
                  )}
                </div>
              )}

              {selectedPlan && (
                <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
                  <h3 className="font-bold text-gray-800 mb-4">Підсумок замовлення:</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Тариф {selectedPlan === 'basic' ? 'Базовий' : 'Преміум'}:</span>
                      <span>{selectedPlan === 'basic' ? `${settings?.basicPlanPrice || 100}₴` : `${settings?.premiumPlanPrice || 200}₴`}</span>
                    </div>
                    {promoDiscount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Знижка ({promoDiscount}%):</span>
                        <span>-{Math.round((selectedPlan === 'basic' ? (settings?.basicPlanPrice || 100) : (settings?.premiumPlanPrice || 200)) * promoDiscount / 100)}₴</span>
                      </div>
                    )}
                    <div className="border-t pt-2 flex justify-between font-bold text-lg">
                      <span>Разом:</span>
                      <span>{Math.round((selectedPlan === 'basic' ? (settings?.basicPlanPrice || 100) : (settings?.premiumPlanPrice || 200)) * (1 - promoDiscount/100))}₴</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-6">
                <button
                  onClick={onPrevStep}
                  className="bg-gray-300 text-gray-700 px-8 py-3 rounded-xl font-bold hover:bg-gray-400 transition-all"
                >
                  ← Назад
                </button>
                <button
                  onClick={onPayment}
                  disabled={!selectedPlan}
                  className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-8 py-3 rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  💳 Оплатити та створити
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
    </div>
  )
} 