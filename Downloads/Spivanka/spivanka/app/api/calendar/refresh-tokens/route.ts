import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { google } from 'googleapis'
import clientPromise from '@/lib/mongodb'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    console.log('🔄 Обновление токенов календаря для:', session.user.email)

    // Получаем токены из базы данных
    const client = await clientPromise
    const db = client.db('spivanka')
    const tokensCollection = db.collection('calendar_tokens')
    
    const calendarTokens = await tokensCollection.findOne({ userEmail: session.user.email })
    
    if (!calendarTokens || !calendarTokens.accessToken) {
      return NextResponse.json({ 
        error: 'Календарь не подключен. Необходимо подключить Google Calendar.',
        needsCalendarAuth: true 
      }, { status: 401 })
    }

    // Создаем OAuth2 клиент
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    )
    
    auth.setCredentials({
      access_token: calendarTokens.accessToken,
      refresh_token: calendarTokens.refreshToken
    })

    // Принудительно обновляем токены
    try {
      console.log('🔄 Принудительное обновление токенов...')
      const { token } = await auth.getAccessToken()
      
      if (token) {
        // Обновляем токены в базе данных
        await tokensCollection.updateOne(
          { userEmail: session.user.email },
          {
            $set: {
              accessToken: token,
              updatedAt: new Date()
            }
          }
        )
        
        console.log('✅ Токены календаря успешно обновлены')
        return NextResponse.json({ 
          success: true,
          message: 'Токены календаря обновлены'
        })
      } else {
        throw new Error('Не удалось получить новый токен')
      }
    } catch (tokenError: any) {
      console.error('❌ Ошибка обновления токенов:', tokenError)
      
      if (tokenError.code === 400 && tokenError.message?.includes('invalid_grant')) {
        console.log('🔄 Токены устарели, требуется переавторизация')
        return NextResponse.json({ 
          error: 'Токены календаря устарели. Необходимо переавторизоваться.',
          needsReauth: true 
        }, { status: 401 })
      }
      
      return NextResponse.json({ 
        error: 'Ошибка обновления токенов календаря',
        details: tokenError.message || 'Неизвестная ошибка'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('❌ Ошибка обновления токенов календаря:', error)
    return NextResponse.json({ 
      error: 'Внутренняя ошибка сервера',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }, { status: 500 })
  }
} 