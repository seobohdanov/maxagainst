import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db()
    
    const textBlocks = await db.collection('textBlocks')
      .find({ isActive: true })
      .sort({ order: 1 })
      .toArray()

    return NextResponse.json(textBlocks)
  } catch (error) {
    console.error('Error fetching text blocks:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 