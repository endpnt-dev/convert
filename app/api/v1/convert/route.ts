import { NextRequest } from 'next/server'
import { validateApiKey, getApiKeyFromHeaders } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { successResponse, errorResponse, generateRequestId, getErrorMessage } from '@/lib/response'
import { convertImage } from '@/lib/image'
import {
  loadAndValidateImage,
  parseRequestBody,
  validateOutputFormatParam,
  validateQualityParam,
  formatImageResponse
} from '@/lib/process'
import { OutputFormat } from '@/lib/config'

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const requestId = generateRequestId()

  try {
    // Check API key
    const apiKey = getApiKeyFromHeaders(request.headers)

    if (!apiKey) {
      return errorResponse(
        'AUTH_REQUIRED',
        getErrorMessage('AUTH_REQUIRED'),
        401,
        { request_id: requestId }
      )
    }

    const keyInfo = validateApiKey(apiKey)

    if (!keyInfo) {
      return errorResponse(
        'INVALID_API_KEY',
        getErrorMessage('INVALID_API_KEY'),
        401,
        { request_id: requestId }
      )
    }

    // Check rate limit
    const rateLimitResult = await checkRateLimit(apiKey!, keyInfo.tier)
    if (!rateLimitResult.allowed) {
      return errorResponse(
        'RATE_LIMIT_EXCEEDED',
        getErrorMessage('RATE_LIMIT_EXCEEDED'),
        429,
        {
          request_id: requestId,
          remaining_credits: rateLimitResult.remaining
        }
      )
    }

    // Parse request body
    const body = await parseRequestBody(request)

    // Validate required parameters
    if (!body.output_format) {
      return errorResponse(
        'INVALID_PARAMS',
        'output_format is required',
        400,
        { request_id: requestId }
      )
    }

    validateOutputFormatParam(body.output_format)
    validateQualityParam(body.quality)

    // Load and validate image
    const { input, originalMetadata } = await loadAndValidateImage(request, body)

    // Convert image
    const processedImage = await convertImage(
      input,
      body.output_format as OutputFormat,
      body.quality,
      body.strip_metadata
    )

    // Format response
    const responseData = formatImageResponse(processedImage, originalMetadata.size)

    const processingTime = Date.now() - startTime

    return successResponse(responseData, {
      request_id: requestId,
      processing_ms: processingTime,
      remaining_credits: rateLimitResult.remaining
    })

  } catch (error) {
    console.error('Convert API error:', error)

    if (error instanceof Error) {
      const errorCode = error.message as any

      if (['INVALID_PARAMS', 'FILE_TOO_LARGE', 'UNSUPPORTED_FORMAT', 'IMAGE_FETCH_FAILED', 'BLOCKED_IMAGE_URL', 'TOO_MANY_REDIRECTS', 'PROCESSING_FAILED'].includes(errorCode)) {
        return errorResponse(
          errorCode,
          getErrorMessage(errorCode),
          400,
          { request_id: requestId }
        )
      }
    }

    return errorResponse(
      'INTERNAL_ERROR',
      getErrorMessage('INTERNAL_ERROR'),
      500,
      { request_id: requestId }
    )
  }
}