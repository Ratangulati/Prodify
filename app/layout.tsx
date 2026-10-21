import type { Metadata } from 'next'
import localFont from 'next/font/local'
import { Newsreader } from 'next/font/google'
import './globals.css'
import { TooltipProvider } from '@/components/ui/tooltip'
import { themeInitScript } from '@/lib/theme'

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
})
const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
})

// Editorial serif for document titles and large headings only
const newsreader = Newsreader({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
  adjustFontFallback: false, // Next has no metrics for Newsreader; skip the size-adjusted fallback
})

export const metadata: Metadata = {
  title: 'Prodify-AI',
  description: 'AI-powered product management workspace',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // The theme attribute is set by themeInitScript before React loads, hence suppressHydrationWarning
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable} antialiased bg-n0 text-n12 overflow-hidden`}>
        <TooltipProvider>
          {children}
        </TooltipProvider>
      </body>
    </html>
  )
}
