import { NextRequest, NextResponse } from 'next/server'
import { processPayment } from '@/services/paymentService'
import type { PaymentData } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const paymentData: PaymentData = body

    if (!paymentData) {
      return NextResponse.json(
        { error: 'Payment data is required' },
        { status: 400 }
      )
    }

    const result = await processPayment(paymentData)

    if (result.success) {
      return NextResponse.json({
        success: true,
        transactionId: result.transactionId
      })
    } else {
      return NextResponse.json(
        { error: result.error || 'Payment failed' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Error processing payment:', error)
    return NextResponse.json(
      { error: 'Failed to process payment' },
      { status: 500 }
    )
  }
} 