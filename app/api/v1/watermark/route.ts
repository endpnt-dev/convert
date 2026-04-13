import { NextRequest } from 'next/server'
import { validateApiKey, getApiKeyFromHeaders } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { successResponse, errorResponse, generateRequestId, getErrorMessage } from '@/lib/response'
import { addWatermark } from '@/lib/image'
import {
  loadAndValidateImage,
  parseRequestBody,
  validateWatermarkParams,
  validateOpacityParam,
  formatImageResponse
} from '@/lib/process'
import { WatermarkPosition, WATERMARK_POSITIONS } from '@/lib/config'

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const requestId = generateRequestId()

  try {
    // Check API key
    const apiKey = getApiKeyFromHeaders(request.headers)
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
    validateWatermarkParams(body.text, body.watermark_url)
    validateOpacityParam(body.opacity)

    // Validate position
    if (body.position && !WATERMARK_POSITIONS.includes(body.position as WatermarkPosition)) {
      return errorResponse(
        'INVALID_PARAMS',
        'Invalid position. Supported: top-left, top-right, bottom-left, bottom-right, center, tile',
        400,
        { request_id: requestId }
      )
    }

    // Load and validate image
    const { input, originalMetadata } = await loadAndValidateImage(request, body)

    // Add watermark
    const processedImage = await addWatermark(input, {
      text: body.text,
      watermarkUrl: body.watermark_url,
      position: (body.position as WatermarkPosition) || 'bottom-right',
      opacity: body.opacity || 50
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
    console.error('Watermark API error:', error)

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