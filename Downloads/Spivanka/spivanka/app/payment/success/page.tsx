'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function PaymentSuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    // Получаем данные из URL параметров
    const orderId = searchParams.get('order_id')
    const amount = searchParams.get('amount')
    const plan = searchParams.get('plan')

    // Сохраняем данные в localStorage для передачи на страницу результата
    if (orderId) {
      localStorage.setItem('payment_success', JSON.stringify({
        orderId,
        amount: amount ? parseFloat(amount) : 0,
        plan: plan || 'basic',
        timestamp: Date.now()
      }))
    }

    // Обратный отсчет
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          // Перенаправляем на главную страницу, где будет показана страница результата
          router.push('/?show_result=true')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [router, searchParams])

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
        <div className="text-6xl mb-4">✅</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          Оплата пройшла успішно!
        </h1>
        <p className="text-gray-600 mb-6">
          Дякуємо за замовлення! Ваше музичне привітання створюється.
          Зараз ви будете перенаправлені на сторінку результату.
        </p>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <p className="text-green-800 text-sm">
            Перенаправлення на сторінку результату через {countdown} секунд...
          </p>
        </div>
        <button
          onClick={() => router.push('/?show_result=true')}
          className="bg-gradient-to-r from-green-500 to-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:shadow-lg transition-all"
        >
          Перейти до результату
        </button>
      </div>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Завантаження...</p>
        </div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  )
} 