import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { emailService } from '@/services/emailService'

export async function POST(request: NextRequest) {
  try {
    // Проверяем авторизацию админа
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Не авторизований' },
        { status: 401 }
      )
    }

    // Проверяем, является ли пользователь админом
    if (session.user.email !== 'seobohdanov@gmail.com') {
      return NextResponse.json(
        { success: false, error: 'Доступ заборонено' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { subject, htmlContent, textContent, testMode = false } = body

    if (!subject || !htmlContent) {
      return NextResponse.json(
        { success: false, error: 'Subject та HTML контент обов\'язкові' },
        { status: 400 }
      )
    }

    // Получаем список пользователей с согласием на маркетинг
    const recipients = await emailService.getMarketingConsentUsers()

    if (recipients.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Немає користувачів з згодою на маркетинг' },
        { status: 400 }
      )
    }

    // В тестовом режиме отправляем только на админа
    const finalRecipients = testMode 
      ? [{ email: session.user.email, unsubscribeToken: 'test' }]
      : recipients

    const template = {
      subject,
      html: htmlContent,
      text: textContent || htmlContent.replace(/<[^>]*>/g, '')
    }

    // Отправляем письма
    const result = await emailService.sendMarketingEmail(template, finalRecipients)

    return NextResponse.json({
      success: true,
      message: testMode ? 'Тестове письмо відправлено' : 'Розсилка запущена',
      result
    })

  } catch (error) {
    console.error('❌ Помилка відправки маркетингової розсилки:', error)
    return NextResponse.json(
      { success: false, error: 'Помилка відправки розсилки' },
      { status: 500 }
    )
  }
} 