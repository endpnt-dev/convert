import { NextRequest } from 'next/server'
import { validateApiKey, getApiKeyFromHeaders } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { successResponse, errorResponse, generateRequestId, getErrorMessage } from '@/lib/response'
import { resizeImage } from '@/lib/image'
import {
  loadAndValidateImage,
  parseRequestBody,
  validateOutputFormatParam,
  validateQualityParam,
  validateResizeParams,
  formatImageResponse
} from '@/lib/process'
import { OutputFormat, FitMode, FIT_MODES } from '@/lib/config'

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
    validateResizeParams(body.width, body.height)
    validateOutputFormatParam(body.output_format)
    validateQualityParam(body.quality)

    // Validate fit mode
    if (body.fit && !FIT_MODES.includes(body.fit as FitMode)) {
      return errorResponse(
        'INVALID_PARAMS',
        'Invalid fit mode. Supported: cover, contain, fill, inside, outside',
        400,
        { request_id: requestId }
      )
    }

    // Load and validate image
    const { input, originalMetadata } = await loadAndValidateImage(request, body)

    // Resize image
    const processedImage = await resizeImage(input, {
      width: body.width,
      height: body.height,
      fit: (body.fit as FitMode) || 'cover',
      outputFormat: body.output_format as OutputFormat,
      quality: body.quality
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
    console.error('Resize API error:', error)

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