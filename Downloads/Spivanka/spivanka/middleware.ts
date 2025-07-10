import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Создаем response с заголовком для обхода ngrok warning
  const response = NextResponse.next()
  
  // Добавляем заголовок для обхода ngrok warning страницы
  response.headers.set('ngrok-skip-browser-warning', 'true')

  // Проверяем доступ к админ-панели
  if (pathname.startsWith('/admin')) {
    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET 
    })
    
    // НЕ редиректим на головну - позволяем админке самой решать что показывать
    // Админка покажет либо сторінку входу, либо відмову доступу, либо панель админа
    // в зависимости от статуса авторизации
  }

  // Проверяем режим обслуживания (исключая админа и API)
  if (!pathname.startsWith('/admin') && !pathname.startsWith('/api')) {
    try {
      // Получаем настройки приложения
      const settingsResponse = await fetch(new URL('/api/admin/settings', request.url), {
        headers: {
          'Cookie': request.headers.get('cookie') || ''
        }
      })
      
      if (settingsResponse.ok) {
        const settings = await settingsResponse.json()
        
        if (settings.maintenanceMode) {
          const token = await getToken({ 
            req: request, 
            secret: process.env.NEXTAUTH_SECRET 
          })
          
          // Показываем страницу обслуживания всем, кроме админа
          if (!token?.email || token.email !== 'seobohdanov@gmail.com') {
            const maintenanceResponse = NextResponse.rewrite(new URL('/maintenance', request.url))
            maintenanceResponse.headers.set('ngrok-skip-browser-warning', 'true')
            return maintenanceResponse
          }
        }
      }
    } catch (error) {
      // Просто логируем ошибку, но не прерываем выполнение
      console.log('Не удалось проверить режим обслуживания (это нормально при разработке):', error instanceof Error ? error.message : 'Неизвестная ошибка')
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|maintenance).*)',
  ]
} 