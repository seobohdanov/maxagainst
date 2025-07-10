import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { saveGreeting, getUserGreetings } from '@/services/databaseService'
import type { Greeting } from '@/types'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const greetings = await getUserGreetings(session.user.email)

    return NextResponse.json({
      success: true,
      greetings
    })
  } catch (error) {
    console.error('Error fetching greetings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch greetings' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const greetingData: Omit<Greeting, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = body

    if (!greetingData) {
      return NextResponse.json(
        { error: 'Greeting data is required' },
        { status: 400 }
      )
    }

    const savedGreeting = await saveGreeting({
      ...greetingData,
      userId: session.user.email
    })

    return NextResponse.json({
      success: true,
      greeting: savedGreeting
    })
  } catch (error) {
    console.error('Error saving greeting:', error)
    return NextResponse.json(
      { error: 'Failed to save greeting' },
      { status: 500 }
    )
  }
} 