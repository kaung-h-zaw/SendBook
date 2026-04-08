import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SendBook – Send & Receive Ebooks via QR Code',
  description:
    'SendBook lets you instantly send and receive ebooks wirelessly using a QR code or 4-character code. No login required. Fast, secure, and free.',
  keywords: [
    'sendbook',
    'send book',
    'send ebook',
    'receive ebook',
    'ebook transfer',
    'QR code ebook',
    'share ebook wirelessly',
    'free ebook transfer',
    'ebook sender',
  ],
  icons: {
    icon: '/sendbook-logo.svg',
    shortcut: '/sendbook-logo.svg',
    apple: '/sendbook-logo.svg',
  },
  openGraph: {
    title: 'SendBook – Send & Receive Ebooks via QR Code',
    description:
      'Instantly share ebooks wirelessly using a QR code or 4-character code. No account needed. Fast and free.',
    url: 'https://send-book.vercel.app',
    siteName: 'SendBook',
    type: 'website',
    images: [
      {
        url: 'https://send-book.vercel.app/sendbook-logo.svg',
        width: 800,
        height: 800,
        alt: 'SendBook Logo',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'SendBook – Send & Receive Ebooks via QR Code',
    description:
      'Instantly share ebooks wirelessly using a QR code or 4-character code. No account needed.',
    images: ['https://send-book.vercel.app/sendbook-logo.svg'],
  },
  alternates: {
    canonical: 'https://send-book.vercel.app',
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
