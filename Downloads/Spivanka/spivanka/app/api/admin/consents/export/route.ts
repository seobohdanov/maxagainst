import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import clientPromise from '@/lib/mongodb'

export async function GET(request: NextRequest) {
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

    const client = await clientPromise
    const db = client.db()
    const consentCollection = db.collection('user_consents')

    // Получаем все согласия
    const consents = await consentCollection
      .find({})
      .sort({ createdAt: -1 })
      .toArray()

    // Создаем CSV
    const csvHeaders = [
      'Email',
      'Згода з умовами',
      'Дата згоди з умовами',
      'IP адреса (умови)',
      'Маркетингова згода',
      'Дата маркетингової згоди',
      'IP адреса (маркетинг)',
      'Дата створення',
      'Дата оновлення'
    ]

    const csvRows = consents.map(consent => [
      consent.email || 'Не вказано',
      consent.termsConsent?.agreed ? 'Так' : 'Ні',
      consent.termsConsent?.date ? new Date(consent.termsConsent.date).toLocaleString('uk-UA') : '',
      consent.termsConsent?.ipAddress || '',
      consent.marketingConsent?.agreed ? 'Так' : 'Ні',
      consent.marketingConsent?.date ? new Date(consent.marketingConsent.date).toLocaleString('uk-UA') : '',
      consent.marketingConsent?.ipAddress || '',
      new Date(consent.createdAt).toLocaleString('uk-UA'),
      new Date(consent.updatedAt).toLocaleString('uk-UA')
    ])

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    // Добавляем BOM для корректного отображения кириллицы в Excel
    const bom = '\uFEFF'
    const csvWithBom = bom + csvContent

    return new NextResponse(csvWithBom, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="consents_${new Date().toISOString().split('T')[0]}.csv"`
      }
    })

  } catch (error) {
    console.error('❌ Помилка експорту згод:', error)
    return NextResponse.json(
      { success: false, error: 'Помилка експорту згод' },
      { status: 500 }
    )
  }
} 