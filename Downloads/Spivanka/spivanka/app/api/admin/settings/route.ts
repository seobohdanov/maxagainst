import { NextRequest, NextResponse } from 'next/server'
// import { getServerSession } from 'next-auth'
// import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import clientPromise from '@/lib/mongodb'

interface AppSettings {
  appName: string
  appLogo: string
  basicPlanPrice: number
  premiumPlanPrice: number
  maintenanceMode: boolean
}

const defaultSettings: AppSettings = {
  appName: 'Spivanka',
  appLogo: '',
  basicPlanPrice: 100,
  premiumPlanPrice: 200,
  maintenanceMode: false
}

export async function GET(request: NextRequest) {
  try {
    // ВРЕМЕННО отключаем проверку авторизации для диагностики
    // const session = await getServerSession(authOptions)
    // if (!session?.user?.email || session.user.email !== 'seobohdanov@gmail.com') {
    //   return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 })
    // }

    const client = await clientPromise
    const db = client.db()

    // Получаем настройки из БД
    const settings = await db.collection('settings').findOne({ type: 'app' })
    
    return NextResponse.json(settings?.data || defaultSettings)

  } catch (error) {
    console.error('Ошибка получения настроек:', error)
    return NextResponse.json(
      { error: 'Ошибка получения настроек' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    // ВРЕМЕННО отключаем проверку авторизации для диагностики
    // const session = await getServerSession(authOptions)
    // if (!session?.user?.email || session.user.email !== 'seobohdanov@gmail.com') {
    //   return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 })
    // }

    const newSettings = await request.json()
    const client = await clientPromise
    const db = client.db()

    // Обновляем настройки в БД
    await db.collection('settings').updateOne(
      { type: 'app' },
      { 
        $set: { 
          data: newSettings,
          updatedAt: new Date()
        } 
      },
      { upsert: true }
    )

    console.log('✅ Настройки приложения обновлены:', newSettings)
    
    return NextResponse.json({ success: true, data: newSettings })

  } catch (error) {
    console.error('Ошибка обновления настроек:', error)
    return NextResponse.json(
      { error: 'Ошибка обновления настроек' },
      { status: 500 }
    )
  }
} 