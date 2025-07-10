import { NextRequest, NextResponse } from 'next/server'
import { getGreetingById, deleteGreeting, updateGreeting } from '@/services/databaseService'
import { getServerSession } from 'next-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: greetingId } = await params
    
    const greeting = await getGreetingById(greetingId)
    
    if (!greeting) {
      return NextResponse.json(
        { success: false, error: 'Привітання не знайдено' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      greeting
    })

  } catch (error) {
    console.error('Error fetching greeting:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Помилка отримання привітання' 
      },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id: greetingId } = await params
    const body = await request.json()
    
    // Проверяем, что приветствие принадлежит пользователю
    const greeting = await getGreetingById(greetingId)
    
    if (!greeting) {
      return NextResponse.json(
        { success: false, error: 'Привітання не знайдено' },
        { status: 404 }
      )
    }

    if (greeting.userId !== session.user.email) {
      return NextResponse.json(
        { success: false, error: 'Немає прав для редагування цього привітання' },
        { status: 403 }
      )
    }

    // Обновляем приветствие
    const updatedGreeting = await updateGreeting(greetingId, {
      ...body,
      updatedAt: new Date().toISOString()
    })
    
    return NextResponse.json({
      success: true,
      greeting: updatedGreeting
    })

  } catch (error) {
    console.error('Error updating greeting:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Помилка оновлення привітання' 
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.email) {
      console.log('❌ DELETE: Неавторизований запит')
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id: greetingId } = await params
    console.log('🗑️ DELETE: Запит на видалення привітання:', greetingId, 'від користувача:', session.user.email)
    
    // Проверяем, что приветствие принадлежит пользователю
    const greeting = await getGreetingById(greetingId)
    
    if (!greeting) {
      console.log('❌ DELETE: Привітання не знайдено:', greetingId)
      return NextResponse.json(
        { success: false, error: 'Привітання не знайдено' },
        { status: 404 }
      )
    }

    console.log('📋 DELETE: Знайдено привітання:', {
      id: greeting.id,
      taskId: greeting.taskId,
      userId: greeting.userId,
      recipientName: greeting.recipientName
    })

    if (greeting.userId !== session.user.email) {
      console.log('❌ DELETE: Немає прав для видалення. Власник:', greeting.userId, 'Запитувач:', session.user.email)
      return NextResponse.json(
        { success: false, error: 'Немає прав для видалення цього привітання' },
        { status: 403 }
      )
    }

    // Удаляем приветствие
    console.log('🗑️ DELETE: Початок видалення привітання...')
    await deleteGreeting(greetingId)
    console.log('✅ DELETE: Привітання успішно видалено')
    
    return NextResponse.json({
      success: true,
      message: 'Привітання успішно видалено'
    })

  } catch (error) {
    console.error('❌ DELETE: Помилка видалення привітання:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Помилка видалення привітання' 
      },
      { status: 500 }
    )
  }
} 