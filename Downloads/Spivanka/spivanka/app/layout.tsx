import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/components/providers/AuthProvider'
import { ClientToast } from '@/components/ClientToast'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Spivanka - Персональні музичні привітання',
  description: 'Створюємо унікальні пісні-привітання з якісними римованими текстами та музикою спеціально для ваших рідних і близьких',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="uk">
      <body className={inter.className}>
        <AuthProvider>
          {children}
          <ClientToast />
        </AuthProvider>
      </body>
    </html>
  )
} 