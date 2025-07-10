import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import clientPromise from '@/lib/mongodb'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email || session.user.email !== 'seobohdanov@gmail.com') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const client = await clientPromise
    const db = client.db()
    
    const textBlocks = await db.collection('textBlocks')
      .find({})
      .sort({ order: 1 })
      .toArray()

    return NextResponse.json(textBlocks)
  } catch (error) {
    console.error('Error fetching text blocks:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email || session.user.email !== 'seobohdanov@gmail.com') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { key, title, description, icon, order, isActive } = body

    if (!key || !title || !description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db()
    
    // Проверяем, что ключ уникален
    const existingBlock = await db.collection('textBlocks').findOne({ key })
    if (existingBlock) {
      return NextResponse.json({ error: 'Block with this key already exists' }, { status: 400 })
    }

    const textBlock = {
      key,
      title,
      description,
      icon: icon || '🎵',
      order: order || 1,
      isActive: isActive !== undefined ? isActive : true,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const result = await db.collection('textBlocks').insertOne(textBlock)

    return NextResponse.json({ 
      ...textBlock, 
      _id: result.insertedId 
    })
  } catch (error) {
    console.error('Error creating text block:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 