import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { LangProvider } from '@/lib/LangContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'BEST Academy',
  description: 'Gamified English Learning Platform',
}

// Asegura el escalado correcto en móviles (responsive)
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <LangProvider>{children}</LangProvider>
      </body>
    </html>
  )
}