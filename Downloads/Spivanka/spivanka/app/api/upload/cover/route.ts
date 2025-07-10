import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    const { b64, ext } = await request.json()
    if (!b64) {
      return NextResponse.json({ error: 'No image data' }, { status: 400 })
    }

    // Генерируем уникальное имя файла
    const fileName = `cover_${Date.now()}_${Math.floor(Math.random() * 10000)}.${ext || 'png'}`
    const filePath = path.join(process.cwd(), 'public', 'covers', fileName)

    // Удаляем префикс data URL, если есть
    const base64Data = b64.replace(/^data:image\/\w+;base64,/, '')

    // Декодируем и сохраняем файл
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(filePath, base64Data, 'base64')

    // Формируем URL
    const url = `/covers/${fileName}`

    return NextResponse.json({ url })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save image' }, { status: 500 })
  }
} 