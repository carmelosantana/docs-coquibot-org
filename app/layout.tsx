import { Footer, LastUpdated, Layout, Navbar } from 'nextra-theme-docs'
import { Head } from 'nextra/components'
import { getPageMap } from 'nextra/page-map'
import { Geist, Geist_Mono } from 'next/font/google'
import Script from 'next/script'
import type { Metadata } from 'next'
import 'nextra-theme-docs/style.css'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap',
  preload: false,
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
  preload: false,
})

export const metadata: Metadata = {
  title: {
    default: 'Coqui Docs',
    template: '%s — Coqui Docs',
  },
  description:
    'Documentation for Coqui — terminal AI agent with multi-model orchestration, persistent sessions, and runtime extensibility via Composer.',
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_BASE_URL || 'https://docs.coquibot.org'
  ),
  openGraph: {
    title: 'Coqui Docs',
    description:
      'Documentation for Coqui — terminal AI agent with multi-model orchestration, persistent sessions, and runtime extensibility via Composer.',
    url: '/',
    siteName: 'Coqui Docs',
    locale: 'en_US',
    type: 'website',
  },
  icons: {
    icon: '/coqui-logo.svg',
  },
}

const logo = (
  <span className="flex items-center gap-2 font-semibold">
    <img src="/coqui-logo.svg" alt="" width={24} height={24} />
    Coqui Docs
  </span>
)

const navbar = (
  <Navbar
    logo={logo}
    projectLink="https://github.com/AgentCoqui/coqui"
    chatLink="https://discord.gg/TaCpZVqbbT"
  />
)

const footer = (
  <Footer>
    <div className="flex w-full flex-col items-center gap-2 sm:flex-row sm:justify-between">
      <span>MIT {new Date().getFullYear()} © Coqui Bot</span>
      <div className="flex gap-4 text-sm">
        <a href="https://coquibot.org" target="_blank" rel="noopener noreferrer">
          Website
        </a>
        <a href="https://coqui.space" target="_blank" rel="noopener noreferrer">
          Marketplace
        </a>
        <a href="https://github.com/sponsors/carmelosantana" target="_blank" rel="noopener noreferrer">
          Sponsor
        </a>
      </div>
    </div>
  </Footer>
)

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      dir="ltr"
      suppressHydrationWarning
    >
      <Head>
      </Head>
      <body
        className={`${geistSans.variable} ${geistMono.variable}`}
      >
        {process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID && (
          <Script
            defer
            src={process.env.NEXT_PUBLIC_UMAMI_URL || 'https://cloud.umami.is/script.js'}
            data-website-id={process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
            strategy="afterInteractive"
          />
        )}
        <Layout
          navbar={navbar}
          pageMap={await getPageMap()}
          docsRepositoryBase="https://github.com/AgentCoqui/coqui/tree/main/docs"
          footer={footer}
          editLink="Edit this page on GitHub"
          lastUpdated={<LastUpdated locale="en-US">Last updated</LastUpdated>}
          sidebar={{ defaultMenuCollapseLevel: 1 }}
          toc={{ float: true }}
        >
          {children}
        </Layout>
      </body>
    </html>
  )
}
