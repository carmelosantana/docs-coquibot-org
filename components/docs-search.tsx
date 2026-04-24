'use client'

import { Search } from 'nextra/components'
import { usePathname } from 'next/navigation'
import { useDeferredValue, useEffect, useRef, useState } from 'react'

type UmamiWindow = Window & {
  umami?: {
    track: (event: string, properties?: Record<string, string | number>) => void
  }
}

function truncate(value: string, maxLength: number): string {
  return value.length > maxLength ? value.slice(0, maxLength) : value
}

function normalizeQuery(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

function trackSearch(query: string, page: string): void {
  if (typeof window === 'undefined') {
    return
  }

  const umami = (window as UmamiWindow).umami

  if (!umami) {
    return
  }

  umami.track('docs-search', {
    query: truncate(query, 120),
    queryLength: query.length,
    page: truncate(page, 120),
  })
}

export function DocsSearch({
  placeholder = 'Search Coqui docs...',
}: {
  placeholder?: string
}) {
  const pathname = usePathname() || '/'
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const lastTrackedQuery = useRef('')

  useEffect(() => {
    const normalizedQuery = normalizeQuery(deferredQuery)

    if (normalizedQuery.length < 2) {
      lastTrackedQuery.current = ''
      return
    }

    const trackingKey = `${pathname}:${normalizedQuery.toLowerCase()}`

    if (lastTrackedQuery.current === trackingKey) {
      return
    }

    const timeout = window.setTimeout(() => {
      trackSearch(normalizedQuery, pathname)
      lastTrackedQuery.current = trackingKey
    }, 350)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [deferredQuery, pathname])

  return (
    <Search
      placeholder={placeholder}
      onSearch={setQuery}
    />
  )
}