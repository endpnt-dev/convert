import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Image Conversion API - Convert, resize, and optimize images with one API call',
  description: 'Fast, reliable image processing API with format conversion, resizing, compression, cropping, and watermarking. Perfect for automation and integration.',
  keywords: ['image conversion', 'api', 'resize', 'compress', 'crop', 'watermark', 'automation'],
  authors: [{ name: 'endpnt.dev' }],
  openGraph: {
    title: 'Image Conversion API - Convert, resize, and optimize images with one API call',
    description: 'Fast, reliable image processing API with format conversion, resizing, and compression.',
    url: 'https://convert.endpnt.dev',
    siteName: 'Image Conversion API',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Image Conversion API - Convert, resize, and optimize images with one API call',
    description: 'Fast, reliable image processing API with format conversion, resizing, and compression.',
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
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  )
}