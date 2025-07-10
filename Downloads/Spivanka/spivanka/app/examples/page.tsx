'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ExamplesPage } from '@/components/pages/ExamplesPage'

export default function ExamplesPageWrapper() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const handleBack = () => {
    router.push('/')
  }

  const handleCreateClick = () => {
    router.push('/')
  }

  const handleLoginClick = async () => {
    const { signIn } = await import('next-auth/react')
    await signIn('google', { callbackUrl: '/dashboard' })
  }

  const handleSignOut = async () => {
    const { signOut } = await import('next-auth/react')
    await signOut({ callbackUrl: '/' })
  }

  const handleDashboardClick = () => {
    router.push('/dashboard')
  }

  const handleCreateFromExample = (exampleData: {
    recipientName: string
    occasion: string
    relationship: string
    musicStyle: string
    mood: string
    greetingLanguage: string
  }) => {
    // Сохраняем данные примера в localStorage для передачи в форму
    localStorage.setItem('exampleData', JSON.stringify(exampleData))
    router.push('/')
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

  return (
    <ExamplesPage
      session={session}
      onBack={handleBack}
      onCreateClick={handleCreateClick}
      onLoginClick={handleLoginClick}
      onSignOut={handleSignOut}
      onDashboardClick={handleDashboardClick}
      onCreateFromExample={handleCreateFromExample}
    />
  )
} 