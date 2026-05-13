import { notFound } from 'next/navigation'
import { generateStaticParamsFor, importPage } from 'nextra/pages'
import { useMDXComponents } from '../../mdx-components'

export const generateStaticParams = generateStaticParamsFor('mdxPath')

const RESERVED_MDX_PATHS = new Set(['_pagefind'])

function assertContentPath(mdxPath?: string[]) {
  const firstSegment = mdxPath?.[0]

  if (firstSegment && RESERVED_MDX_PATHS.has(firstSegment)) {
    notFound()
  }

  return mdxPath
}

export async function generateMetadata(props: {
  params: Promise<{ mdxPath?: string[] }>
}) {
  const params = await props.params
  const mdxPath = assertContentPath(params.mdxPath)
  const { metadata } = await importPage(mdxPath)
  return metadata
}

const { wrapper: Wrapper } = useMDXComponents()

export default async function Page(props: {
  params: Promise<{ mdxPath?: string[] }>
}) {
  const params = await props.params
  const mdxPath = assertContentPath(params.mdxPath)
  const result = await importPage(mdxPath)
  const { default: MDXContent, toc, metadata } = result
  return (
    <Wrapper toc={toc} metadata={metadata}>
      <MDXContent {...props} params={params} />
    </Wrapper>
  )
}
