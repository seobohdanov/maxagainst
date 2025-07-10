import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import clientPromise from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

// Функция для отзыва разрешений у Google
async function revokeGooglePermissions(accessToken: string) {
  try {
    console.log('🔄 Відкликаю дозволи у Google...')
    
    const response = await fetch('https://oauth2.googleapis.com/revoke', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        token: accessToken,
      }),
    })

    if (response.ok) {
      console.log('✅ Дозволи успішно відкликано у Google')
      return true
    } else {
      console.error('❌ Помилка відкликання дозволів у Google:', response.status, response.statusText)
      return false
    }
  } catch (error) {
    console.error('❌ Помилка відкликання дозволів у Google:', error)
    return false
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID згоди обов\'язковий' },
        { status: 400 }
      )
    }

    const client = await clientPromise
    const db = client.db()
    const consentCollection = db.collection('user_consents')

    // Проверяем, существует ли согласие
    const existingConsent = await consentCollection.findOne({ _id: new ObjectId(id) })
    
    if (!existingConsent) {
      return NextResponse.json(
        { success: false, error: 'Згоду не знайдено' },
        { status: 404 }
      )
    }

    // Получаем email пользователя для удаления связанных данных
    const userEmail = existingConsent.email

    // Удаляем согласие
    const result = await consentCollection.deleteOne({ _id: new ObjectId(id) })

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Помилка видалення згоди' },
        { status: 500 }
      )
    }

    // Если есть email пользователя, удаляем связанные данные
    if (userEmail) {
      try {
        // Получаем токены пользователя для отзыва разрешений
        const tokensCollection = db.collection('user_tokens')
        const userTokens = await tokensCollection.find({ email: userEmail.toLowerCase() }).toArray()
        
        // Отзываем разрешения у Google для всех токенов пользователя
        for (const token of userTokens) {
          if (token.accessToken) {
            await revokeGooglePermissions(token.accessToken)
          }
        }

        // Удаляем токены пользователя
        const tokensResult = await tokensCollection.deleteMany({ email: userEmail.toLowerCase() })
        console.log(`🗑️ Видалено ${tokensResult.deletedCount} токенів для ${userEmail}`)

        // Удаляем кэш календаря
        const calendarCacheCollection = db.collection('calendar_cache')
        const cacheResult = await calendarCacheCollection.deleteMany({ userEmail: userEmail.toLowerCase() })
        console.log(`🗑️ Видалено ${cacheResult.deletedCount} записів кешу календаря для ${userEmail}`)

        // Удаляем токены календаря (если есть отдельная коллекция)
        const calendarTokensCollection = db.collection('calendar_tokens')
        const calendarTokensResult = await calendarTokensCollection.deleteMany({ userEmail: userEmail.toLowerCase() })
        console.log(`🗑️ Видалено ${calendarTokensResult.deletedCount} токенів календаря для ${userEmail}`)

      } catch (error) {
        console.error('❌ Помилка видалення пов\'язаних даних:', error)
        // Не прерываем выполнение, так как основное удаление согласия прошло успешно
      }
    }

    console.log(`✅ Видалено згоду з ID: ${id} та пов'язані дані для ${userEmail || 'невідомого користувача'}`)

    return NextResponse.json({
      success: true,
      message: 'Згоду успішно видалено'
    })

  } catch (error) {
    console.error('❌ Помилка видалення згоди:', error)
    return NextResponse.json(
      { success: false, error: 'Помилка видалення згоди' },
      { status: 500 }
    )
  }
} 