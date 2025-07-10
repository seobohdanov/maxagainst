import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import clientPromise from '@/lib/mongodb'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const client = await clientPromise
    const db = client.db()
    
    // Удаляем старые незавершенные записи (старше 1 часа)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    
    const [greetingsResult, statusResult] = await Promise.all([
      // Удаляем из greetings коллекции
      db.collection('greetings').deleteMany({
        userId: session.user.email,
        updatedAt: { $lt: oneHourAgo },
        status: { $in: ['PENDING', 'TEXT_SUCCESS', 'FIRST_SUCCESS'] }
      }),
      
      // Удаляем из generation_status коллекции
      db.collection('generation_status').deleteMany({
        userId: session.user.email,
        updatedAt: { $lt: oneHourAgo },
        status: { $in: ['PENDING', 'TEXT_SUCCESS', 'FIRST_SUCCESS'] }
      })
    ])

    const totalDeleted = greetingsResult.deletedCount + statusResult.deletedCount
    
    console.log(`🧹 Очищено ${totalDeleted} старих записів для користувача:`, session.user.email)
    
    return NextResponse.json({
      success: true,
      deletedCount: totalDeleted,
      message: `Очищено ${totalDeleted} старих записів`
    })
  } catch (error) {
    console.error('Error cleaning up old records:', error)
    return NextResponse.json(
      { error: 'Failed to cleanup old records' },
      { status: 500 }
    )
  }
} 