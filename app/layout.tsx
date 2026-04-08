import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SendBook',
  description: 'Secure ebook transfer via QR code',
  icons: {
    icon: '/sendbook-logo.svg',
    shortcut: '/sendbook-logo.svg',
    apple: '/sendbook-logo.svg',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="sendo-api-base" content="" />
        <meta name="sendo-session-id" content="" />
        <meta name="sendo-receiver-token" content="" />
      </head>
      <body>{children}</body>
    </html>
  )
}
