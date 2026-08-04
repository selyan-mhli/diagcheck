import type { Metadata } from 'next'
import { Inter, Source_Serif_4 } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'
import { Toaster } from '@/components/ui/toaster'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'DiagCheck : la pré-vérification des dossiers de diagnostics immobiliers',
  description:
    'Outil d\'aide à la vérification documentaire pour agences immobilières. Ne certifie pas juridiquement la conformité.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" className={`${inter.variable} ${sourceSerif.variable}`}>
      <body className="font-sans">
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}
