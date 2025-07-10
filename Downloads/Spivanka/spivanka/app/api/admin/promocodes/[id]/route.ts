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
    // Проверяем авторизацию админа
    const session = await getServerSession(authOptions)
    if (!session?.user?.email || session.user.email !== 'seobohdanov@gmail.com') {
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 })
    }

    const { id } = await params
    const updateData = await request.json()
    const client = await clientPromise
    const db = client.db()

    // Если обновляется код промокода, проверяем уникальность
    if (updateData.code) {
      const existingPromo = await db.collection('promocodes').findOne({
        code: updateData.code.toUpperCase(),
        _id: { $ne: new ObjectId(id) }
      })

      if (existingPromo) {
        return NextResponse.json(
          { error: 'Промокод с таким кодом уже существует' },
          { status: 400 }
        )
      }
    }

    // Подготавливаем данные для обновления
    const updateFields: any = {
      updatedAt: new Date()
    }

    if (updateData.code) updateFields.code = updateData.code.toUpperCase()
    if (updateData.discount !== undefined) updateFields.discount = updateData.discount
    if (updateData.description !== undefined) updateFields.description = updateData.description
    if (updateData.isActive !== undefined) updateFields.isActive = updateData.isActive
    if (updateData.usageLimit !== undefined) updateFields.usageLimit = updateData.usageLimit
    if (updateData.validFrom) updateFields.validFrom = new Date(updateData.validFrom)
    if (updateData.validUntil) updateFields.validUntil = new Date(updateData.validUntil)

    // Обновляем промокод
    const result = await db.collection('promocodes').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateFields }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Промокод не найден' }, { status: 404 })
    }

    console.log('✅ Промокод обновлен:', id)
    
    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Ошибка обновления промокода:', error)
    return NextResponse.json(
      { error: 'Ошибка обновления промокода' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Проверяем авторизацию админа
    const session = await getServerSession(authOptions)
    if (!session?.user?.email || session.user.email !== 'seobohdanov@gmail.com') {
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 })
    }

    const { id } = await params
    const client = await clientPromise
    const db = client.db()

    // Удаляем промокод
    const result = await db.collection('promocodes').deleteOne({
      _id: new ObjectId(id)
    })

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Промокод не найден' }, { status: 404 })
    }

    console.log('✅ Промокод удален:', id)
    
    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Ошибка удаления промокода:', error)
    return NextResponse.json(
      { error: 'Ошибка удаления промокода' },
      { status: 500 }
    )
  }
} 