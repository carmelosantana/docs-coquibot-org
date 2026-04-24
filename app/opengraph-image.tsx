import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Coqui Docs'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OGImage() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://docs.coquibot.org'
  const logoData = await fetch(new URL('/coqui-bot-512.png', baseUrl)).then(
    response => response.arrayBuffer()
  )
  const logoSrc = `data:image/png;base64,${Buffer.from(logoData).toString('base64')}`

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '56px',
          background:
            'radial-gradient(circle at top, rgba(204, 233, 114, 0.20), transparent 28%), radial-gradient(circle at 85% 15%, rgba(38, 138, 80, 0.20), transparent 24%), linear-gradient(135deg, #0f1412 0%, #141a18 48%, #0f1412 100%)',
          color: '#f8fafc',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '18px',
          }}
        >
          <img
            src={logoSrc}
            alt=""
            width="72"
            height="72"
            style={{ borderRadius: '999px' }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span
              style={{
                fontSize: '56px',
                fontWeight: 700,
                letterSpacing: '-0.04em',
              }}
            >
              Coqui Docs
            </span>
            <span
              style={{
                fontSize: '18px',
                textTransform: 'uppercase',
                letterSpacing: '0.28em',
                color: '#a3a3a3',
              }}
            >
              PHP 8.4+ · MIT License
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          <div
            style={{
              fontSize: '44px',
              fontWeight: 600,
              lineHeight: 1.15,
              letterSpacing: '-0.03em',
              maxWidth: '880px',
            }}
          >
            Install Coqui, learn the runtime, and extend it with guides,
            examples, profiles, and toolkits.
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            {['Getting Started', 'Features', 'Development'].map(label => (
              <div
                key={label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: '999px',
                  padding: '12px 20px',
                  border: '1px solid rgba(204, 233, 114, 0.25)',
                  background: 'rgba(204, 233, 114, 0.08)',
                  color: '#d7f98d',
                  fontSize: '20px',
                }}
              >
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}