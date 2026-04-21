import { NextResponse } from 'next/server'
import { ErrorCode } from './config'

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    code: ErrorCode
    message: string
  }
  meta?: {
    request_id?: string
    processing_ms?: number
    remaining_credits?: number
  }
}

export function successResponse<T>(
  data: T,
  meta?: ApiResponse<T>['meta'],
  status: number = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      meta,
    },
    { status }
  )
}

export function errorResponse(
  code: ErrorCode,
  message: string,
  status: number = 400,
  meta?: ApiResponse['meta']
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
      },
      meta,
    },
    { status }
  )
}

export function generateRequestId(): string {
  return `req_${Math.random().toString(36).substr(2, 8)}`
}

export function getErrorMessage(code: ErrorCode): string {
  const messages: Record<ErrorCode, string> = {
    AUTH_REQUIRED: 'API key is required. Include x-api-key header.',
    INVALID_API_KEY: 'Invalid API key. Check your credentials.',
    RATE_LIMIT_EXCEEDED: 'Rate limit exceeded. Please try again later.',
    INVALID_PARAMS: 'Invalid parameters. Check the request format.',
    FILE_TOO_LARGE: 'File is too large. Maximum size is 10MB.',
    UNSUPPORTED_FORMAT: 'Unsupported image format. Supported formats: JPEG, PNG, WebP, AVIF, TIFF, GIF, SVG.',
    IMAGE_FETCH_FAILED: 'Failed to fetch image from URL. Check the image URL.',
    BLOCKED_IMAGE_URL: 'Image URL is blocked. Cannot access private networks or blocked domains.',
    TOO_MANY_REDIRECTS: 'Too many redirects when fetching image URL.',
    PROCESSING_FAILED: 'Failed to process image. Please try again.',
    INTERNAL_ERROR: 'Internal server error. Please try again later.',
    DEMO_UNAVAILABLE: 'Demo service temporarily unavailable',
    ORIGIN_NOT_ALLOWED: 'Demo endpoint only accessible from the landing page',
    UNSUPPORTED_OPERATION: 'Method not allowed for demo endpoint',
  }
  return messages[code]
}