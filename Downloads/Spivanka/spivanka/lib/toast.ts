// Безопасная функция для toast, которая работает только на клиенте
let toast: any = null

if (typeof window !== 'undefined') {
  import('react-hot-toast').then((module) => {
    toast = module.default
  })
}

export const safeToast = {
  success: (message: string) => {
    if (toast && typeof window !== 'undefined') {
      toast.success(message)
    }
  },
  error: (message: string) => {
    if (toast && typeof window !== 'undefined') {
      toast.error(message)
    }
  }
} 