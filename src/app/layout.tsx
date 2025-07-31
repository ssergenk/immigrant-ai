import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ImmigrantAI - AI-Powered Immigration Guidance Platform',
  description: 'Get instant immigration help with our AI-powered assistant. Available 24/7 for visa applications, green cards, citizenship, and more. Trusted by 5,000+ immigrants.',
  keywords: 'immigration, visa, green card, citizenship, AI, immigration lawyer, H1B, asylum, naturalization',
  authors: [{ name: 'ImmigrantAI Team' }],
  openGraph: {
    title: 'ImmigrantAI - AI-Powered Immigration Guidance',
    description: 'Get instant immigration help with our AI-powered assistant. Available 24/7 for all your immigration needs.',
    url: 'https://myimmigrationai.com',
    siteName: 'ImmigrantAI',
    images: [
      {
        url: 'https://rushrcville.com/wp-content/uploads/2025/04/AI-LOGO-FINAL.png',
        width: 1200,
        height: 630,
        alt: 'ImmigrantAI - AI-Powered Immigration Guidance',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ImmigrantAI - AI-Powered Immigration Guidance',
    description: 'Get instant immigration help with our AI-powered assistant. Available 24/7.',
    images: ['https://rushrcville.com/wp-content/uploads/2025/04/AI-LOGO-FINAL.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="https://rushrcville.com/wp-content/uploads/2025/04/AI-LOGO-FINAL.png" type="image/png" />
        <link rel="apple-touch-icon" href="https://rushrcville.com/wp-content/uploads/2025/04/AI-LOGO-FINAL.png" />
        <meta name="theme-color" content="#1a1a2e" />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  )
}