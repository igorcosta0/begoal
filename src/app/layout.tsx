import type { Metadata } from 'next'
import { Sora, IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google'
import './globals.css'

const sora = Sora({ subsets: ['latin'], weight: ['500', '600', '700', '800'], variable: '--font-display' })
const plexSans = IBM_Plex_Sans({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-body' })
const plexMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['500', '600'], variable: '--font-mono' })

export const metadata: Metadata = {
  title: 'Begoal — Gestão de OKRs',
  description: 'Plataforma de gestão e controle de OKRs',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={`${sora.variable} ${plexSans.variable} ${plexMono.variable} font-sans`}>
        {children}
      </body>
    </html>
  )
}
