import { NextRequest, NextResponse } from 'next/server'
import { checkDemoRateLimit } from './rate-limit'
import { errorResponse, generateRequestId } from './response'

export interface DemoProxyOptions {
  /**
   * The API endpoint path to proxy to (without the /api/v1 or /api/v2 prefix).
   * Examples: '/capture', '/unfurl', '/convert', '/validate/email'
   */
  endpoint: string

  /** HTTP methods allowed for this proxy. Defaults to ['POST']. */
  allowedMethods?: string[]

  /**
   * API version to target. Defaults to 'v1'.
   * Currently no caller uses 'v2'; reserved for future flexibility.
   */
  apiVersion?: 'v1' | 'v2'

  /**
   * Allowed origins/referers for this demo endpoint. Required.
   * Must include the production URL (e.g., 'https://color.endpnt.dev'),
   * and typically 'http://localhost:3000' + 'http://127.0.0.1:3000' for local dev.
   */
  allowedOrigins: string[]

  /**
   * Optional post-processing function applied to the response body.
   * Only called if the upstream response is 2xx.
   *
   * Currently UNUSED by any caller. Reserved for future per-repo customization
   * (e.g., watermarking, response trimming). Kept in the interface so the helper
   * file is forward-compatible without per-repo divergence.
   */
  postProcess?: (responseData: any) => Promise<any>
}

function checkOrigin(request: NextRequest, allowedOrigins: string[]): boolean {
  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')

  if (origin && allowedOrigins.includes(origin)) {
    return true
  }

  if (referer) {
    for (const allowed of allowedOrigins) {
      if (referer.startsWith(allowed)) {
        return true
      }
    }
  }

  return false
}

export async function demoProxy(
  request: NextRequest,
  options: DemoProxyOptions
): Promise<NextResponse> {
  const requestId = generateRequestId()
  const startTime = Date.now()

  const apiVersion = options.apiVersion || 'v1'
  const allowedMethods = options.allowedMethods || ['POST']

  // 1. Method check
  if (!allowedMethods.includes(request.method)) {
    return errorResponse(
      'UNSUPPORTED_OPERATION',
      `Method ${request.method} not allowed for demo endpoint`,
      405,
      { request_id: requestId }
    )
  }

  // 2. Origin check (prevents direct curl abuse of demo endpoint)
  if (!checkOrigin(request, options.allowedOrigins)) {
    return errorResponse(
      'ORIGIN_NOT_ALLOWED',
      'Demo endpoint only accessible from the landing page',
      403,
      { request_id: requestId }
    )
  }

  // 3. Rate limit check (by IP)
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
             request.headers.get('x-real-ip') ||
             'unknown'

  const rateLimitResult = await checkDemoRateLimit(ip)
  if (!rateLimitResult.allowed) {
    return errorResponse(
      'RATE_LIMIT_EXCEEDED',
      'Demo rate limit exceeded. Please try again later.',
      429,
      {
        request_id: requestId,
        processing_ms: Date.now() - startTime,
        remaining_credits: rateLimitResult.remaining,
      }
    )
  }

  // 4. Demo key availability check
  const demoApiKey = process.env.DEMO_API_KEY
  if (!demoApiKey) {
    return errorResponse(
      'DEMO_UNAVAILABLE',
      'Demo service temporarily unavailable',
      503,
      { request_id: requestId }
    )
  }

  // 5. Forward to internal API route
  try {
    // Preserve the original query string when building the target URL.
    // `new URL(path, base)` replaces both path AND query string with the new path,
    // so we must explicitly carry over `incomingUrl.search` from the original request.
    const incomingUrl = new URL(request.url)
    const targetUrl = new URL(
      `/api/${apiVersion}${options.endpoint}${incomingUrl.search}`,
      request.url
    ).toString()

    // Preserve all original headers relevant to body parsing (notably content-type
    // with its multipart boundary parameter, if present). Swap in the demo key for auth.
    const headers = new Headers()
    const originalContentType = request.headers.get('content-type')
    if (originalContentType) {
      headers.set('content-type', originalContentType)
    } else {
      headers.set('content-type', 'application/json')
    }
    headers.set('x-api-key', demoApiKey)

    // Read body as ArrayBuffer to preserve bytes exactly across any content type
    // (JSON, multipart/form-data, application/octet-stream, etc.). DO NOT use
    // request.text() — that corrupts multipart boundaries and binary uploads.
    let body: ArrayBuffer | undefined
    if (request.method !== 'GET') {
      body = await request.arrayBuffer()
    }

    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
    })

    let responseData = await response.json()

    // 6. Optional post-processing — only on successful responses.
    // Currently unused; reserved for future per-repo customization.
    if (options.postProcess && response.ok) {
      responseData = await options.postProcess(responseData)
    }

    // 7. Inject demo meta
    if (responseData.meta) {
      responseData.meta.request_id = requestId
      responseData.meta.processing_ms = Date.now() - startTime
      responseData.meta.remaining_credits = rateLimitResult.remaining
    }

    return NextResponse.json(responseData, { status: response.status })

  } catch (error) {
    console.error('Demo proxy error:', error)
    return errorResponse(
      'INTERNAL_ERROR',
      'Demo service error',
      500,
      {
        request_id: requestId,
        processing_ms: Date.now() - startTime,
      }
    )
  }
}