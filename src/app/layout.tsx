import type { Metadata, Viewport } from 'next'
import { Inter, Space_Grotesk, Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import { LangProvider } from '@/lib/LangContext'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-display' })
const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['700', '800'], variable: '--font-stat' })

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
    <html lang="es" className={`${inter.variable} ${spaceGrotesk.variable} ${jakarta.variable}`}>
      <body className={inter.className}>
        <LangProvider>{children}</LangProvider>
      </body>
    </html>
  )
}