import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import clientPromise from '@/lib/mongodb'

// Функция для обновления токена доступа
async function refreshAccessToken(token: any) {
  try {
    console.log('🔄 Обновляю токен доступа Google...')
    
    const url = 'https://oauth2.googleapis.com/token'
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: 'refresh_token',
        refresh_token: token.refreshToken,
      }),
      method: 'POST',
    })

    const refreshedTokens = await response.json()

    if (!response.ok) {
      console.error('❌ Ошибка обновления токена:', refreshedTokens)
      throw refreshedTokens
    }

    console.log('✅ Токен успешно обновлен')
    
    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken, // Fallback to old refresh token
    }
  } catch (error) {
    console.error('❌ Ошибка обновления токена:', error)
    
    return {
      ...token,
      error: 'RefreshAccessTokenError',
    }
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          access_type: "offline",
          response_type: "code",
          // Только базовые скоупы для основной авторизации
          scope: "openid email profile"
        }
      }
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 дней
  },
  callbacks: {
    async jwt({ token, user, account }: any) {
      try {
        // Первичная авторизация
        if (account && user) {
          console.log('🔐 JWT callback: сохраняю токены', {
            access_token: account.access_token ? 'присутствует' : 'отсутствует',
            refresh_token: account.refresh_token ? 'присутствует' : 'отсутствует',
            expires_at: account.expires_at
          })
          return {
            ...token,
            accessToken: account.access_token,
            refreshToken: account.refresh_token,
            accessTokenExpires: account.expires_at * 1000, // Конвертируем в миллисекунды
          }
        }

        // Проверяем, не истек ли токен
        if (Date.now() < token.accessTokenExpires) {
          console.log('🔐 JWT callback: токен еще действителен')
          return token
        }

        // Токен истек, обновляем его
        console.log('🔄 JWT callback: токен истек, обновляю...')
        return await refreshAccessToken(token)
      } catch (error) {
        console.error('JWT callback error:', error)
        return token
      }
    },
    async session({ session, token }: any) {
      try {
        if (token && session.user) {
          (session.user as any).id = token.sub!
          ;(session as any).accessToken = token.accessToken
          ;(session as any).refreshToken = token.refreshToken
          ;(session as any).accessTokenExpires = token.accessTokenExpires
          ;(session as any).error = token.error
          
          console.log('🔐 Session callback: передаю токены в сессию', {
            accessToken: token.accessToken ? 'присутствует' : 'отсутствует',
            refreshToken: token.refreshToken ? 'присутствует' : 'отсутствует',
            error: token.error || 'нет'
          })
        }
        return session
      } catch (error) {
        console.error('Session callback error:', error)
        return session
      }
    },
    async redirect({ url, baseUrl }) {
      // Если это перенаправление после авторизации, проверяем согласия
      if (url.startsWith(baseUrl)) {
        // Если это dashboard, перенаправляем на проверку согласий
        if (url.includes('/dashboard')) {
          return `${baseUrl}/api/auth/check-consents`
        }
        // Если это главная страница после авторизации, тоже проверяем согласия
        if (url === baseUrl) {
          return `${baseUrl}/api/auth/check-consents`
        }
      }
      return url
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
  logger: {
    error(code: any, metadata: any) {
      console.error('NextAuth error:', code, metadata)
    },
    warn(code: any) {
      console.warn('NextAuth warning:', code)
    },
    debug(code: any, metadata: any) {
      if (process.env.NODE_ENV === 'development') {
        console.log('NextAuth debug:', code, metadata)
      }
    }
  }
} 