import { useMDXComponents as getThemeComponents } from 'nextra-theme-docs'
import type { MDXComponents } from 'mdx/types'
import type { ComponentPropsWithoutRef } from 'react'

const themeComponents = getThemeComponents()

function joinClassNames(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(' ')
}

function isExternalHref(href: string) {
  return /^(https?:)?\/\//.test(href) || href.startsWith('mailto:')
}

function DocLink({
  className,
  href = '',
  rel,
  target,
  ...props
}: ComponentPropsWithoutRef<'a'>) {
  const external = isExternalHref(href)

  return (
    <a
      {...props}
      href={href}
      className={joinClassNames('coqui-doc-link', className)}
      rel={rel ?? (external ? 'noreferrer' : undefined)}
      target={target ?? (external ? '_blank' : undefined)}
    />
  )
}

function Callout({
  className,
  ...props
}: ComponentPropsWithoutRef<'blockquote'>) {
  return <blockquote {...props} className={joinClassNames('coqui-callout', className)} />
}

export function useMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...themeComponents,
    a: DocLink,
    blockquote: Callout,
    ...components,
  }
}
