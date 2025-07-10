import { Session } from 'next-auth'

export interface User {
  id: string
  name: string
  email: string
  avatar: string
  authProvider: string
}

export interface FormData {
  recipientName: string
  occasion: string
  relationship: string
  personalDetails: string
  musicStyle: string
  mood: string
  greetingLanguage: string
  voiceType: 'female' | 'male' | 'duet'
  useStarStyle: boolean
  artistStyle?: string
  generatedText?: string
  isCustomOccasion?: boolean
}

export interface Greeting {
  id: string
  taskId?: string
  status?: GenerationStatus
  recipientName: string
  occasion: string
  relationship: string
  personalDetails: string
  musicStyle: string
  mood: string
  greetingLanguage: string
  voiceType?: 'female' | 'male' | 'duet'
  useStarStyle?: boolean
  artistStyle?: string
  text: string
  plan: Plan
  totalPrice: number
  paymentMethod: PaymentMethod
  musicUrl?: string
  secondMusicUrl?: string
  coverUrl?: string
  userId: string
  allowSharing?: boolean
  createdAt: string
  updatedAt: string
}

export type GenerationStatus = 'PENDING' | 'TEXT_SUCCESS' | 'FIRST_SUCCESS' | 'SUCCESS' | 'FAILED' | 'GENERATE_AUDIO_FAILED'
export type Plan = 'basic' | 'premium'
export type PaymentMethod = 'fondy' | 'liqpay' | 'googlepay' | 'applepay' | 'card'
export type MusicGenerationStep = 'uploading' | 'text-processing' | 'processing' | 'complete'

export interface PaymentData {
  method: PaymentMethod
  amount: number
  greetingData: {
    recipientName: string
    occasion: string
    relationship: string
    personalDetails: string
    musicStyle: string
    mood: string
    greetingLanguage: string
    voiceType: 'female' | 'male' | 'duet'
    useStarStyle: boolean
    artistStyle?: string
    text: string
    plan: Plan
    promoCode?: string
  }
}

export interface PaymentResult {
  success: boolean
  transactionId?: string
  error?: string
}

export interface Payment {
  id: string
  taskId?: string
  orderId: string
  transactionId?: string
  userEmail: string
  userId: string
  amount: number
  plan: Plan
  status: 'success' | 'pending' | 'failed'
  paymentMethod: PaymentMethod
  description: string
  recipientName?: string
  occasion?: string
  createdAt: string | Date
  updatedAt: string | Date
  liqpayData?: any
  fondyData?: any
}

export interface CalendarEvent {
  id: string
  title: string
  date: string
  type: 'birthday' | 'holiday' | 'custom'
  recipient?: string
  description?: string
  isCustom?: boolean
  notified?: boolean
}

export interface SessionWithUser extends Session {
  user: {
    id: string
    name: string
    email: string
    image: string
  }
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface GenerationState {
  isGenerating: boolean
  currentStep: number
  formData: FormData
  generatedText: string
  selectedPlan: Plan | null
  isPaid: boolean
  promoCode: string
  promoDiscount: number
  makePublic: boolean
  generatedMusicUrl: string
  secondMusicUrl: string
  generatedCoverUrl: string
  musicGenerationStep: MusicGenerationStep
  isUpdatingMusic: boolean
  taskId: string | null
}

export interface GenerationStatusResponse {
  success: boolean
  status: GenerationStatus
  type: string
  musicUrl?: string
  coverUrl?: string
  secondMusicUrl?: string
  openaiCoverStatus?: string
  openaiCoverUrl?: string
  openaiCoverError?: string
  data?: any
  formData?: FormData
  text?: string
  error?: string
  details?: string
}

export interface MusicGenerationResult {
  success: boolean
  taskId?: string
  type: string
  url?: string
  coverUrl?: string
  error?: string
} 