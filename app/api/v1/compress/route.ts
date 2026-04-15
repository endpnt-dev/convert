import { NextRequest } from 'next/server'
import { validateApiKey, getApiKeyFromHeaders } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { successResponse, errorResponse, generateRequestId, getErrorMessage } from '@/lib/response'
import { compressImage } from '@/lib/image'
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

    // Validate parameters
    validateOutputFormatParam(body.output_format)
    validateQualityParam(body.quality)

    // Default quality for compression
    const quality = body.quality || 60

    // Load and validate image
    const { input, originalMetadata } = await loadAndValidateImage(request, body)

    // Compress image
    const processedImage = await compressImage(
      input,
      quality,
      body.output_format as OutputFormat
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
    console.error('Compress API error:', error)

    if (error instanceof Error) {
      const errorCode = error.message as any

      if (['INVALID_PARAMS', 'FILE_TOO_LARGE', 'UNSUPPORTED_FORMAT', 'IMAGE_FETCH_FAILED', 'PROCESSING_FAILED'].includes(errorCode)) {
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