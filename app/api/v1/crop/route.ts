import { NextRequest } from 'next/server'
import { validateApiKey, getApiKeyFromHeaders } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { successResponse, errorResponse, generateRequestId, getErrorMessage } from '@/lib/response'
import { cropImage } from '@/lib/image'
import {
  loadAndValidateImage,
  parseRequestBody,
  validateCropParams,
  formatImageResponse
} from '@/lib/process'

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
    validateCropParams(body.x, body.y, body.width, body.height, body.smart)

    // Load and validate image
    const { input, originalMetadata } = await loadAndValidateImage(request, body)

    // Crop image
    const processedImage = await cropImage(input, {
      x: body.x,
      y: body.y,
      width: body.width!,
      height: body.height!,
      smart: body.smart
    })

    // Format response
    const responseData = formatImageResponse(processedImage, originalMetadata.size)

    const processingTime = Date.now() - startTime

    return successResponse(responseData, {
      request_id: requestId,
      processing_ms: processingTime,
      remaining_credits: rateLimitResult.remaining
    })

  } catch (error) {
    console.error('Crop API error:', error)

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