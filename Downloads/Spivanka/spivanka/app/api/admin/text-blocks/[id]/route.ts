import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import clientPromise from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Не авторизований' },
        { status: 401 }
      )
    }

    if (session.user.email !== 'seobohdanov@gmail.com') {
      return NextResponse.json(
        { success: false, error: 'Доступ заборонено' },
        { status: 403 }
      )
    }

    const { id } = await params

    const body = await request.json()
    const { key, title, description, icon, order, isActive } = body

    if (!key || !title || !description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db()
    
    // Проверяем, что ключ уникален (исключая текущий блок)
    const existingBlock = await db.collection('textBlocks').findOne({
      key,
      _id: { $ne: new ObjectId(id) }
    })
    if (existingBlock) {
      return NextResponse.json({ error: 'Block with this key already exists' }, { status: 400 })
    }

    const updateData = {
      key,
      title,
      description,
      icon: icon || '🎵',
      order: order || 1,
      isActive: isActive !== undefined ? isActive : true,
      updatedAt: new Date()
    }

    const result = await db.collection('textBlocks').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Text block not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating text block:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Не авторизований' },
        { status: 401 }
      )
    }

    if (session.user.email !== 'seobohdanov@gmail.com') {
      return NextResponse.json(
        { success: false, error: 'Доступ заборонено' },
        { status: 403 }
      )
    }

    const { id } = await params

    const client = await clientPromise
    const db = client.db()
    
    const result = await db.collection('textBlocks').deleteOne({
      _id: new ObjectId(id)
    })

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Text block not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting text block:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 