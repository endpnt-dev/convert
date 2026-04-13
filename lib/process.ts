import {
  parseImageFromRequest,
  loadImageFromUrl,
  validateInputFormat,
  validateOutputFormat,
  getImageMetadata,
  ImageInput
} from './image'
import { ErrorCode } from './config'

export interface ProcessImageOptions {
  image_url?: string
  output_format?: string
  quality?: number
  strip_metadata?: boolean
  width?: number
  height?: number
  fit?: string
  x?: number
  y?: number
  smart?: boolean
  text?: string
  watermark_url?: string
  position?: string
  opacity?: number
}

export interface ProcessResult {
  input: ImageInput
  originalMetadata: {
    width: number
    height: number
    format: string
    size: number
  }
}

// Main function to load and validate image input
export async function loadAndValidateImage(
  request: Request,
  body: ProcessImageOptions
): Promise<ProcessResult> {
  let input: ImageInput | null = null

  // Try to get image from upload first
  input = await parseImageFromRequest(request)

  // If no upload, try image_url
  if (!input && body.image_url) {
    try {
      input = await loadImageFromUrl(body.image_url)
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message)
      }
      throw new Error('IMAGE_FETCH_FAILED')
    }
  }

  if (!input) {
    throw new Error('INVALID_PARAMS')
  }

  // Validate input format
  if (!validateInputFormat(input.format)) {
    throw new Error('UNSUPPORTED_FORMAT')
  }

  // Get original metadata
  const originalMetadata = await getImageMetadata(input.buffer)

  return {
    input,
    originalMetadata
  }
}

// Validate and parse request body parameters
export async function parseRequestBody(request: Request): Promise<ProcessImageOptions> {
  try {
    const contentType = request.headers.get('content-type') || ''

    if (contentType.includes('multipart/form-data')) {
      // Parse form data
      const formData = await request.formData()
      const body: ProcessImageOptions = {}

      // Extract all form fields
      for (const [key, value] of formData.entries()) {
        if (key !== 'image' && typeof value === 'string') {
          (body as any)[key] = value
        }
      }

      // Convert numeric fields
      if (body.quality) body.quality = parseInt(body.quality)
      if (body.width) body.width = parseInt(body.width)
      if (body.height) body.height = parseInt(body.height)
      if (body.x !== undefined) body.x = parseInt(body.x)
      if (body.y !== undefined) body.y = parseInt(body.y)
      if (body.opacity) body.opacity = parseInt(body.opacity)

      // Convert boolean fields
      if (body.strip_metadata) body.strip_metadata = body.strip_metadata === 'true'
      if (body.smart) body.smart = body.smart === 'true'

      return body
    } else {
      // Parse JSON body
      return await request.json()
    }
  } catch (error) {
    throw new Error('INVALID_PARAMS')
  }
}

// Validate output format parameter
export function validateOutputFormatParam(format?: string): void {
  if (format && !validateOutputFormat(format)) {
    throw new Error('UNSUPPORTED_FORMAT')
  }
}

// Validate quality parameter
export function validateQualityParam(quality?: number): void {
  if (quality !== undefined && (quality < 1 || quality > 100)) {
    throw new Error('INVALID_PARAMS')
  }
}

// Validate resize parameters
export function validateResizeParams(width?: number, height?: number): void {
  if (!width && !height) {
    throw new Error('INVALID_PARAMS')
  }

  if (width !== undefined && (width < 1 || width > 8000)) {
    throw new Error('INVALID_PARAMS')
  }

  if (height !== undefined && (height < 1 || height > 8000)) {
    throw new Error('INVALID_PARAMS')
  }
}

// Validate crop parameters
export function validateCropParams(
  x?: number,
  y?: number,
  width?: number,
  height?: number,
  smart?: boolean
): void {
  if (!width || !height) {
    throw new Error('INVALID_PARAMS')
  }

  if (width < 1 || height < 1) {
    throw new Error('INVALID_PARAMS')
  }

  if (!smart && (x === undefined || y === undefined)) {
    throw new Error('INVALID_PARAMS')
  }

  if (x !== undefined && x < 0) {
    throw new Error('INVALID_PARAMS')
  }

  if (y !== undefined && y < 0) {
    throw new Error('INVALID_PARAMS')
  }
}

// Validate watermark parameters
export function validateWatermarkParams(text?: string, watermarkUrl?: string): void {
  if (!text && !watermarkUrl) {
    throw new Error('INVALID_PARAMS')
  }
}

// Validate opacity parameter
export function validateOpacityParam(opacity?: number): void {
  if (opacity !== undefined && (opacity < 1 || opacity > 100)) {
    throw new Error('INVALID_PARAMS')
  }
}

// Calculate savings percentage
export function calculateSavings(originalSize: number, newSize: number): number {
  if (originalSize === 0) return 0
  return Math.round(((originalSize - newSize) / originalSize) * 100 * 10) / 10
}

// Format response data for image operations
export function formatImageResponse(
  processedImage: {
    buffer: Buffer
    format: string
    width: number
    height: number
    size: number
  },
  originalSize: number
) {
  const base64Image = processedImage.buffer.toString('base64')
  const savingsPercent = calculateSavings(originalSize, processedImage.size)

  return {
    image: base64Image,
    format: processedImage.format,
    width: processedImage.width,
    height: processedImage.height,
    file_size_bytes: processedImage.size,
    original_size_bytes: originalSize,
    savings_percent: savingsPercent
  }
}