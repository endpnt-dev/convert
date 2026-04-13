'use client'

import { useState } from 'react'
import { Settings, Download, RefreshCw, Zap } from 'lucide-react'
import ImageUploader from './ImageUploader'
import BeforeAfter from './BeforeAfter'

const outputFormats = [
  { value: 'webp', label: 'WebP', description: 'Best compression' },
  { value: 'jpeg', label: 'JPEG', description: 'Universal support' },
  { value: 'png', label: 'PNG', description: 'Lossless quality' },
  { value: 'avif', label: 'AVIF', description: 'Next-gen format' },
]

const qualityOptions = [
  { value: 90, label: 'High (90%)', description: 'Best quality' },
  { value: 80, label: 'Good (80%)', description: 'Recommended' },
  { value: 60, label: 'Medium (60%)', description: 'Balanced' },
  { value: 40, label: 'Low (40%)', description: 'Small file' },
]

interface ProcessedImage {
  data: string
  format: string
  width: number
  height: number
  originalSize: number
  newSize: number
  savingsPercent: number
}

export default function ImageDemo() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [imageUrl, setImageUrl] = useState<string>('')
  const [outputFormat, setOutputFormat] = useState('webp')
  const [quality, setQuality] = useState(80)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processedImage, setProcessedImage] = useState<ProcessedImage | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleImageSelect = (file: File | null, url?: string) => {
    setSelectedFile(file)
    setImageUrl(url || '')
    setProcessedImage(null)
    setError(null)
  }

  const processImage = async () => {
    if (!selectedFile && !imageUrl) {
      setError('Please select an image first')
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      const formData = new FormData()

      if (selectedFile) {
        formData.append('image', selectedFile)
      } else if (imageUrl) {
        formData.append('image_url', imageUrl)
      }

      formData.append('output_format', outputFormat)
      formData.append('quality', quality.toString())

      const response = await fetch('/api/v1/convert', {
        method: 'POST',
        headers: {
          'x-api-key': 'ek_live_demo123', // Demo API key
        },
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to process image')
      }

      setProcessedImage({
        data: result.data.image,
        format: result.data.format,
        width: result.data.width,
        height: result.data.height,
        originalSize: result.data.original_size_bytes,
        newSize: result.data.file_size_bytes,
        savingsPercent: result.data.savings_percent,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process image')
    } finally {
      setIsProcessing(false)
    }
  }

  const downloadImage = () => {
    if (!processedImage) return

    const link = document.createElement('a')
    link.href = `data:image/${processedImage.format};base64,${processedImage.data}`
    link.download = `converted.${processedImage.format}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const getOriginalImageUrl = () => {
    if (selectedFile) {
      return URL.createObjectURL(selectedFile)
    }
    return imageUrl
  }

  const getProcessedImageUrl = () => {
    if (processedImage) {
      return `data:image/${processedImage.format};base64,${processedImage.data}`
    }
    return ''
  }

  return (
    <div className="space-y-8">
      {/* Upload Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">1. Upload your image</h3>
        <ImageUploader onImageSelect={handleImageSelect} isLoading={isProcessing} />
      </div>

      {/* Settings Section */}
      {(selectedFile || imageUrl) && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Settings className="h-5 w-5" />
            2. Choose output settings
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Format Selection */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Output Format</label>
              <div className="grid grid-cols-2 gap-2">
                {outputFormats.map((format) => (
                  <button
                    key={format.value}
                    onClick={() => setOutputFormat(format.value)}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      outputFormat === format.value
                        ? 'border-primary-600 bg-primary-600/5'
                        : 'border-border hover:border-primary-600/50'
                    }`}
                  >
                    <div className="font-medium">{format.label}</div>
                    <div className="text-xs text-muted-foreground">{format.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Quality Selection */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Quality</label>
              <div className="space-y-2">
                {qualityOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setQuality(option.value)}
                    className={`w-full p-3 rounded-lg border text-left transition-colors ${
                      quality === option.value
                        ? 'border-primary-600 bg-primary-600/5'
                        : 'border-border hover:border-primary-600/50'
                    }`}
                  >
                    <div className="font-medium">{option.label}</div>
                    <div className="text-xs text-muted-foreground">{option.description}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Process Button */}
          <button
            onClick={processImage}
            disabled={isProcessing || (!selectedFile && !imageUrl)}
            className="w-full py-3 px-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                Convert Image
              </>
            )}
          </button>

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}
        </div>
      )}

      {/* Results Section */}
      {processedImage && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">3. Compare results</h3>
            <button
              onClick={downloadImage}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              Download
            </button>
          </div>

          <BeforeAfter
            beforeImage={getOriginalImageUrl()}
            afterImage={getProcessedImageUrl()}
            beforeLabel="Original"
            afterLabel={`${outputFormat.toUpperCase()} (${quality}%)`}
            beforeSize={processedImage.originalSize}
            afterSize={processedImage.newSize}
          />

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-muted rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-primary-600">
                {processedImage.savingsPercent}%
              </div>
              <div className="text-sm text-muted-foreground">File size reduction</div>
            </div>
            <div className="bg-muted rounded-lg p-4 text-center">
              <div className="text-2xl font-bold">
                {processedImage.width}×{processedImage.height}
              </div>
              <div className="text-sm text-muted-foreground">Dimensions</div>
            </div>
            <div className="bg-muted rounded-lg p-4 text-center">
              <div className="text-2xl font-bold">
                {processedImage.format.toUpperCase()}
              </div>
              <div className="text-sm text-muted-foreground">Output format</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}