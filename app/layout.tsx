import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Mulk Invest',
  description: "Ko'chmas mulk bozori",
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="uz">
      <head>
        <script src="https://telegram.org/js/telegram-web-app.js" async />
      </head>
      <body style={{ margin: 0, padding: 0, background: '#0f172a', minHeight: '100dvh' }}>
        {children}
      </body>
    </html>
  )
}