import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{
        background: 'linear-gradient(45deg, #3b82f6, #2563eb)',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14,2 14,8 20,8"/>
          <circle cx="10" cy="13" r="2"/>
          <path d="m20 17-1.09-1.09a2 2 0 0 0-2.83 0L10 22"/>
          <path d="M8 21h12"/>
        </svg>
      </div>
    ),
    { ...size }
  )
}