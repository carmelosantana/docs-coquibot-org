import nextra from 'nextra'

const withNextra = nextra({
  // Content lives under content/ directory
})

/** @type {import('next').NextConfig} */
export default withNextra({
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
})
