import { NextRequest, NextResponse } from 'next/server'
import { getGenerationStatus } from '@/services/sunoService'
import clientPromise from '@/lib/mongodb'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const taskId = searchParams.get('taskId')

  if (!taskId) {
    return NextResponse.json({ error: 'TaskId is required' }, { status: 400 })
  }

  console.log(`🔗 SSE підключення для taskId: ${taskId}`)

  // Устанавливаем заголовки для SSE
  const headers = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  }

  const stream = new ReadableStream({
    async start(controller) {
      let lastStatus: string | null = null
      let attempts = 0
      let isClosed = false
      const maxAttempts = 240 // 20 минут (240 * 5 секунд)

      const sendEvent = (data: any) => {
        if (isClosed) {
          console.log(`⚠️ SSE: спроба відправити дані після закриття контролера для taskId: ${taskId}`)
          return
        }
        
        try {
          if (data.data) {
            data.data.openaiCoverStatus = data.data.openaiCoverStatus || ''
            data.data.openaiCoverUrl = data.data.openaiCoverUrl || ''
            data.data.openaiCoverError = data.data.openaiCoverError || ''
          }
          const event = `data: ${JSON.stringify(data)}\n\n`
          
          // Проверяем, что контроллер еще открыт
          if (controller.desiredSize !== null) {
            controller.enqueue(new TextEncoder().encode(event))
          } else {
            console.log(`⚠️ SSE: контролер вже закритий для taskId: ${taskId}`)
            isClosed = true
          }
        } catch (error) {
          console.error(`❌ SSE помилка відправки для taskId: ${taskId}:`, error)
          isClosed = true
        }
      }

      const closeConnection = () => {
        if (!isClosed) {
          isClosed = true
          try {
            if (controller.desiredSize !== null) {
              controller.close()
            }
          } catch (error) {
            console.error(`❌ SSE помилка закриття для taskId: ${taskId}:`, error)
          }
        }
      }

      const checkStatus = async () => {
        if (isClosed) {
          return
        }

        try {
          // Сначала проверяем статус в нашей базе данных
          let result: any = null
          
          try {
            const client = await clientPromise
            const db = client.db()
            const statusRecord = await db.collection('generation_status').findOne({ taskId })
            
            if (statusRecord) {
              console.log(`📡 SSE: знайдено статус в БД для taskId: ${taskId} - ${statusRecord.status}`)
              result = {
                success: true,
                status: statusRecord.status,
                text: statusRecord.text || '',
                musicUrl: statusRecord.musicUrl || '',
                secondMusicUrl: statusRecord.secondMusicUrl || '',
                coverUrl: statusRecord.coverUrl || '',
                formData: statusRecord.formData || {}
              }
            }
          } catch (dbError) {
            console.log(`⚠️ SSE: помилка читання з БД для taskId: ${taskId}:`, dbError)
          }
          
          // Если в БД ничего нет, проверяем внешний API
          if (!result) {
            console.log(`📡 SSE: перевіряю зовнішній API для taskId: ${taskId}`)
            result = await getGenerationStatus(taskId)
          } else {
            console.log(`📡 SSE: статус не знайдено в БД та зовнішньому API для taskId: ${taskId}`)
          }
          
          if (result && result.success && result.status) {
            // Отправляем обновление только если статус изменился
            if (lastStatus !== result.status) {
              console.log(`📡 SSE: відправляю оновлення статусу ${result.status} для taskId: ${taskId}`)
              sendEvent({
                type: 'status_update',
                taskId,
                status: result.status,
                data: result
              })
              lastStatus = result.status
            } else {
              console.log(`📡 SSE: статус не змінився ${result.status} для taskId: ${taskId}`)
            }

            // Если генерация завершена, отправляем финальное событие и закрываем соединение
            if (result.status === 'SUCCESS') {
              console.log(`✅ SSE: генерація завершена для taskId: ${taskId}`)
              sendEvent({
                type: 'generation_complete',
                taskId,
                status: result.status,
                data: result
              })
              closeConnection()
              return
            }

            // Если генерация не удалась, закрываем соединение
            if (result.status === 'FAILED' || result.status === 'GENERATE_AUDIO_FAILED') {
              console.log(`❌ SSE: генерація не вдалася для taskId: ${taskId}, статус: ${result.status}`)
              sendEvent({
                type: result.status === 'GENERATE_AUDIO_FAILED' ? 'generate_audio_failed' : 'generation_failed',
                taskId,
                status: result.status,
                data: result
              })
              closeConnection()
              return
            }
          }

          attempts++
          
          // Если превышено время ожидания, закрываем соединение
          if (attempts >= maxAttempts) {
            console.log(`⏰ SSE: час очікування вичерпано для taskId: ${taskId}`)
            sendEvent({
              type: 'timeout',
              taskId,
              message: 'Generation timeout'
            })
            closeConnection()
            return
          }

          // Используем динамический интервал: чаще в начале, реже потом
          const interval = attempts < 10 ? 2000 : attempts < 30 ? 3000 : 5000
          if (!isClosed) {
            setTimeout(checkStatus, interval)
          }
        } catch (error) {
          console.error(`❌ SSE помилка для taskId: ${taskId}:`, error)
          sendEvent({
            type: 'error',
            taskId,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
          closeConnection()
        }
      }

      // Отправляем начальное событие
      sendEvent({
        type: 'connected',
        taskId,
        message: 'SSE connection established'
      })

      // Запускаем немедленную проверку статуса при подключении
      setTimeout(() => {
        if (!isClosed) {
          checkStatus()
        }
      }, 100)
    }
  })

  return new Response(stream, { headers })
} 