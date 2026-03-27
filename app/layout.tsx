import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import '@rainbow-me/rainbowkit/styles.css'
import { UserProvider } from '@/lib/user-context'
import { Web3Providers } from '@/lib/web3-providers'
import { Toaster } from "@/components/ui/sonner"

const inter = Inter({ 
  subsets: ["latin"],
  variable: '--font-inter'
});

const jetbrainsMono = JetBrains_Mono({ 
  subsets: ["latin"],
  variable: '--font-mono'
});

export const metadata: Metadata = {
  title: 'VCRED - Decentralized Academic Credentials',
  description: 'Secure, verifiable academic credentials on the blockchain. Issue, manage, and verify certificates with cryptographic proof.',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  themeColor: '#09090b',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`} suppressHydrationWarning>
        <UserProvider>
          <Web3Providers>
            {children}
          </Web3Providers>
          <Analytics />
        </UserProvider>
        <Toaster position="top-center" />
      </body>
    </html>
  )
}
