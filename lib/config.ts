export const API_VERSION = '1.0.0'

export const DEMO_RATE_LIMIT = {
  requests_per_window: 20,
  window_minutes: 10
} as const

export const TIER_LIMITS = {
  free: {
    requests_per_minute: 10,
    requests_per_month: 100
  },
  starter: {
    requests_per_minute: 60,
    requests_per_month: 5000
  },
  pro: {
    requests_per_minute: 300,
    requests_per_month: 25000
  },
  enterprise: {
    requests_per_minute: 1000,
    requests_per_month: 100000
  },
} as const

export const IMAGE_LIMITS = {
  max_file_size_bytes: 10 * 1024 * 1024, // 10MB
  max_width: 8000,
  max_height: 8000,
  min_width: 1,
  min_height: 1,
}

export const SUPPORTED_INPUT_FORMATS = [
  'jpeg', 'jpg', 'png', 'webp', 'avif', 'tiff', 'gif', 'svg'
] as const

export const SUPPORTED_OUTPUT_FORMATS = [
  'png', 'jpeg', 'webp', 'avif', 'tiff'
] as const

export const FIT_MODES = [
  'cover', 'contain', 'fill', 'inside', 'outside'
] as const

export const WATERMARK_POSITIONS = [
  'top-left', 'top-right', 'bottom-left', 'bottom-right', 'center', 'tile'
] as const

export const ERROR_CODES = {
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  INVALID_API_KEY: 'INVALID_API_KEY',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INVALID_PARAMS: 'INVALID_PARAMS',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  UNSUPPORTED_FORMAT: 'UNSUPPORTED_FORMAT',
  IMAGE_FETCH_FAILED: 'IMAGE_FETCH_FAILED',
  BLOCKED_IMAGE_URL: 'BLOCKED_IMAGE_URL',
  TOO_MANY_REDIRECTS: 'TOO_MANY_REDIRECTS',
  PROCESSING_FAILED: 'PROCESSING_FAILED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DEMO_UNAVAILABLE: 'DEMO_UNAVAILABLE',
  ORIGIN_NOT_ALLOWED: 'ORIGIN_NOT_ALLOWED',
  UNSUPPORTED_OPERATION: 'UNSUPPORTED_OPERATION',
} as const

export type InputFormat = typeof SUPPORTED_INPUT_FORMATS[number]
export type OutputFormat = typeof SUPPORTED_OUTPUT_FORMATS[number]
export type FitMode = typeof FIT_MODES[number]
export type WatermarkPosition = typeof WATERMARK_POSITIONS[number]
// SSRF protection - private IP ranges to block
export const BLOCKED_IP_RANGES = [
  '127.0.0.0/8',     // Loopback
  '10.0.0.0/8',      // Private Class A
  '172.16.0.0/12',   // Private Class B
  '192.168.0.0/16',  // Private Class C
  '169.254.0.0/16',  // Link-local
  '224.0.0.0/4',     // Multicast
  '240.0.0.0/4',     // Reserved
  'fc00::/7',        // IPv6 Private
  'fe80::/10',       // IPv6 Link-local
  '::1/128',         // IPv6 Loopback
]

export const BLOCKED_DOMAINS = [
  'localhost',
  '0.0.0.0',
]

export type ApiTier = keyof typeof TIER_LIMITS
export type ErrorCode = keyof typeof ERROR_CODES