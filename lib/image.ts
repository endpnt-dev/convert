import sharp from 'sharp'
import formidable from 'formidable'
import { promises as fs } from 'fs'
import {
  IMAGE_LIMITS,
  SUPPORTED_INPUT_FORMATS,
  SUPPORTED_OUTPUT_FORMATS,
  OutputFormat,
  FitMode,
  WatermarkPosition
} from './config'

export interface ImageInput {
  buffer: Buffer
  format: string
  size: number
}

export interface ImageMetadata {
  width: number
  height: number
  format: string
  size: number
}

export interface ProcessedImage {
  buffer: Buffer
  format: OutputFormat
  width: number
  height: number
  size: number
}

// Parse multipart form data and extract image
export async function parseImageFromRequest(request: Request): Promise<ImageInput | null> {
  try {
    const contentType = request.headers.get('content-type') || ''

    if (!contentType.includes('multipart/form-data')) {
      return null
    }

    const formData = await request.formData()
    const imageFile = formData.get('image') as File | null

    if (!imageFile || !(imageFile instanceof File)) {
      return null
    }

    // Check file size
    if (imageFile.size > IMAGE_LIMITS.max_file_size_bytes) {
      throw new Error('FILE_TOO_LARGE')
    }

    const buffer = Buffer.from(await imageFile.arrayBuffer())
    const format = detectImageFormat(imageFile.name, imageFile.type)

    return {
      buffer,
      format,
      size: buffer.length
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'FILE_TOO_LARGE') {
      throw error
    }
    return null
  }
}

// Load image from URL
export async function loadImageFromUrl(url: string): Promise<ImageInput> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'endpnt.dev Image Converter Bot 1.0'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`)
    }

    const contentLength = response.headers.get('content-length')
    if (contentLength && parseInt(contentLength) > IMAGE_LIMITS.max_file_size_bytes) {
      throw new Error('FILE_TOO_LARGE')
    }

    const buffer = Buffer.from(await response.arrayBuffer())

    if (buffer.length > IMAGE_LIMITS.max_file_size_bytes) {
      throw new Error('FILE_TOO_LARGE')
    }

    const contentType = response.headers.get('content-type') || ''
    const format = detectImageFormatFromMime(contentType)

    return {
      buffer,
      format,
      size: buffer.length
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'FILE_TOO_LARGE') {
      throw error
    }
    throw new Error('IMAGE_FETCH_FAILED')
  }
}

// Detect image format from filename and MIME type
export function detectImageFormat(filename: string, mimeType: string): string {
  // Try MIME type first
  const formatFromMime = detectImageFormatFromMime(mimeType)
  if (formatFromMime !== 'unknown') {
    return formatFromMime
  }

  // Fall back to file extension
  const ext = filename.split('.').pop()?.toLowerCase()
  if (!ext) return 'unknown'

  const formatMap: Record<string, string> = {
    'jpg': 'jpeg',
    'jpeg': 'jpeg',
    'png': 'png',
    'webp': 'webp',
    'avif': 'avif',
    'tiff': 'tiff',
    'tif': 'tiff',
    'gif': 'gif',
    'svg': 'svg'
  }

  return formatMap[ext] || 'unknown'
}

function detectImageFormatFromMime(mimeType: string): string {
  const mimeMap: Record<string, string> = {
    'image/jpeg': 'jpeg',
    'image/jpg': 'jpeg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/avif': 'avif',
    'image/tiff': 'tiff',
    'image/gif': 'gif',
    'image/svg+xml': 'svg'
  }

  return mimeMap[mimeType] || 'unknown'
}

// Validate input format is supported
export function validateInputFormat(format: string): boolean {
  return SUPPORTED_INPUT_FORMATS.includes(format as any)
}

// Validate output format is supported
export function validateOutputFormat(format: string): boolean {
  return SUPPORTED_OUTPUT_FORMATS.includes(format as any)
}

// Get image metadata without processing
export async function getImageMetadata(buffer: Buffer): Promise<ImageMetadata> {
  try {
    const metadata = await sharp(buffer).metadata()

    return {
      width: metadata.width || 0,
      height: metadata.height || 0,
      format: metadata.format || 'unknown',
      size: buffer.length
    }
  } catch (error) {
    throw new Error('PROCESSING_FAILED')
  }
}

// Convert image format
export async function convertImage(
  input: ImageInput,
  outputFormat: OutputFormat,
  quality?: number,
  stripMetadata: boolean = true
): Promise<ProcessedImage> {
  try {
    let pipeline = sharp(input.buffer)

    if (stripMetadata) {
      pipeline = pipeline.rotate() // This strips metadata
    }

    // Apply format conversion with quality if applicable
    switch (outputFormat) {
      case 'jpeg':
        pipeline = pipeline.jpeg({ quality: quality || 80 })
        break
      case 'png':
        pipeline = pipeline.png()
        break
      case 'webp':
        pipeline = pipeline.webp({ quality: quality || 80 })
        break
      case 'avif':
        pipeline = pipeline.avif({ quality: quality || 80 })
        break
      case 'tiff':
        pipeline = pipeline.tiff()
        break
      default:
        throw new Error('UNSUPPORTED_FORMAT')
    }

    const outputBuffer = await pipeline.toBuffer()
    const metadata = await sharp(outputBuffer).metadata()

    return {
      buffer: outputBuffer,
      format: outputFormat,
      width: metadata.width || 0,
      height: metadata.height || 0,
      size: outputBuffer.length
    }
  } catch (error) {
    throw new Error('PROCESSING_FAILED')
  }
}

// Resize image
export async function resizeImage(
  input: ImageInput,
  options: {
    width?: number
    height?: number
    fit?: FitMode
    outputFormat?: OutputFormat
    quality?: number
  }
): Promise<ProcessedImage> {
  try {
    let pipeline = sharp(input.buffer)

    const { width, height, fit = 'cover', outputFormat, quality } = options

    if (!width && !height) {
      throw new Error('INVALID_PARAMS')
    }

    // Resize with fit mode
    pipeline = pipeline.resize(width, height, {
      fit: fit,
      withoutEnlargement: false
    })

    // Apply format conversion if specified
    if (outputFormat) {
      switch (outputFormat) {
        case 'jpeg':
          pipeline = pipeline.jpeg({ quality: quality || 80 })
          break
        case 'png':
          pipeline = pipeline.png()
          break
        case 'webp':
          pipeline = pipeline.webp({ quality: quality || 80 })
          break
        case 'avif':
          pipeline = pipeline.avif({ quality: quality || 80 })
          break
        case 'tiff':
          pipeline = pipeline.tiff()
          break
      }
    }

    const outputBuffer = await pipeline.toBuffer()
    const metadata = await sharp(outputBuffer).metadata()

    return {
      buffer: outputBuffer,
      format: outputFormat || (input.format as OutputFormat),
      width: metadata.width || 0,
      height: metadata.height || 0,
      size: outputBuffer.length
    }
  } catch (error) {
    throw new Error('PROCESSING_FAILED')
  }
}

// Compress image
export async function compressImage(
  input: ImageInput,
  quality: number,
  outputFormat?: OutputFormat
): Promise<ProcessedImage> {
  try {
    let pipeline = sharp(input.buffer)
    const targetFormat = outputFormat || (input.format as OutputFormat)

    // Apply compression with quality
    switch (targetFormat) {
      case 'jpeg':
        pipeline = pipeline.jpeg({ quality })
        break
      case 'webp':
        pipeline = pipeline.webp({ quality })
        break
      case 'avif':
        pipeline = pipeline.avif({ quality })
        break
      case 'png':
        // PNG is lossless, but we can optimize
        pipeline = pipeline.png({ compressionLevel: 9 })
        break
      case 'tiff':
        pipeline = pipeline.tiff()
        break
      default:
        throw new Error('UNSUPPORTED_FORMAT')
    }

    const outputBuffer = await pipeline.toBuffer()
    const metadata = await sharp(outputBuffer).metadata()

    return {
      buffer: outputBuffer,
      format: targetFormat,
      width: metadata.width || 0,
      height: metadata.height || 0,
      size: outputBuffer.length
    }
  } catch (error) {
    throw new Error('PROCESSING_FAILED')
  }
}

// Crop image
export async function cropImage(
  input: ImageInput,
  options: {
    x?: number
    y?: number
    width: number
    height: number
    smart?: boolean
  }
): Promise<ProcessedImage> {
  try {
    let pipeline = sharp(input.buffer)

    const { x, y, width, height, smart = false } = options

    if (smart) {
      // Use Sharp's attention-based smart crop
      pipeline = pipeline.resize(width, height, {
        fit: 'cover',
        position: 'attention'
      })
    } else {
      // Manual crop with x, y coordinates
      if (x === undefined || y === undefined) {
        throw new Error('INVALID_PARAMS')
      }
      pipeline = pipeline.extract({ left: x, top: y, width, height })
    }

    const outputBuffer = await pipeline.toBuffer()
    const metadata = await sharp(outputBuffer).metadata()

    return {
      buffer: outputBuffer,
      format: input.format as OutputFormat,
      width: metadata.width || 0,
      height: metadata.height || 0,
      size: outputBuffer.length
    }
  } catch (error) {
    throw new Error('PROCESSING_FAILED')
  }
}

// Add watermark to image
export async function addWatermark(
  input: ImageInput,
  options: {
    text?: string
    watermarkUrl?: string
    position?: WatermarkPosition
    opacity?: number
  }
): Promise<ProcessedImage> {
  try {
    const { text, watermarkUrl, position = 'bottom-right', opacity = 50 } = options

    if (!text && !watermarkUrl) {
      throw new Error('INVALID_PARAMS')
    }

    let pipeline = sharp(input.buffer)

    if (text) {
      // Create text watermark using SVG
      const textSvg = createTextWatermarkSvg(text, opacity)
      const textBuffer = Buffer.from(textSvg)

      // Get image dimensions to position watermark
      const metadata = await sharp(input.buffer).metadata()
      const { gravity, left, top } = getWatermarkPosition(position, metadata.width || 0, metadata.height || 0, 200, 50)

      pipeline = pipeline.composite([{
        input: textBuffer,
        gravity,
        left,
        top
      }])
    } else if (watermarkUrl) {
      // Load watermark image
      const watermarkInput = await loadImageFromUrl(watermarkUrl)
      const watermarkBuffer = sharp(watermarkInput.buffer)
        .modulate({ lightness: 1, saturation: 1 })
        .png({ palette: true })
        .toBuffer()

      // Get image dimensions to position watermark
      const metadata = await sharp(input.buffer).metadata()
      const watermarkMeta = await sharp(watermarkInput.buffer).metadata()
      const { gravity, left, top } = getWatermarkPosition(
        position,
        metadata.width || 0,
        metadata.height || 0,
        watermarkMeta.width || 0,
        watermarkMeta.height || 0
      )

      pipeline = pipeline.composite([{
        input: await watermarkBuffer,
        gravity,
        left,
        top,
        blend: 'overlay'
      }])
    }

    const outputBuffer = await pipeline.toBuffer()
    const metadata = await sharp(outputBuffer).metadata()

    return {
      buffer: outputBuffer,
      format: input.format as OutputFormat,
      width: metadata.width || 0,
      height: metadata.height || 0,
      size: outputBuffer.length
    }
  } catch (error) {
    throw new Error('PROCESSING_FAILED')
  }
}

// Helper function to create text watermark SVG
function createTextWatermarkSvg(text: string, opacity: number): string {
  const alpha = opacity / 100
  return `
    <svg width="200" height="50">
      <text x="10" y="30" font-family="Arial, sans-serif" font-size="16"
            fill="white" fill-opacity="${alpha}" stroke="black" stroke-width="1" stroke-opacity="${alpha / 2}">
        ${text}
      </text>
    </svg>
  `
}

// Helper function to calculate watermark position
function getWatermarkPosition(
  position: WatermarkPosition,
  imageWidth: number,
  imageHeight: number,
  watermarkWidth: number,
  watermarkHeight: number
): { gravity?: string, left?: number, top?: number } {
  const padding = 20

  switch (position) {
    case 'top-left':
      return { left: padding, top: padding }
    case 'top-right':
      return { left: imageWidth - watermarkWidth - padding, top: padding }
    case 'bottom-left':
      return { left: padding, top: imageHeight - watermarkHeight - padding }
    case 'bottom-right':
      return { left: imageWidth - watermarkWidth - padding, top: imageHeight - watermarkHeight - padding }
    case 'center':
      return { gravity: 'center' }
    case 'tile':
      return { gravity: 'center' } // Simplified - Sharp doesn't support easy tiling
    default:
      return { gravity: 'southeast' }
  }
}