'use client'

import { useState, useCallback } from 'react'
import { Upload, Link, X, Image as ImageIcon } from 'lucide-react'

interface ImageUploaderProps {
  onImageSelect: (file: File | null, url?: string) => void
  isLoading?: boolean
}

export default function ImageUploader({ onImageSelect, isLoading }: ImageUploaderProps) {
  const [dragOver, setDragOver] = useState(false)
  const [inputMethod, setInputMethod] = useState<'upload' | 'url'>('upload')
  const [imageUrl, setImageUrl] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)

    const files = Array.from(e.dataTransfer.files)
    const imageFile = files.find(file => file.type.startsWith('image/'))

    if (imageFile) {
      setSelectedFile(imageFile)
      onImageSelect(imageFile)
    }
  }, [onImageSelect])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file)
      onImageSelect(file)
    }
  }, [onImageSelect])

  const handleUrlSubmit = useCallback(() => {
    if (imageUrl.trim()) {
      setSelectedFile(null)
      onImageSelect(null, imageUrl.trim())
    }
  }, [imageUrl, onImageSelect])

  const clearSelection = () => {
    setSelectedFile(null)
    setImageUrl('')
    onImageSelect(null)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="space-y-4">
      {/* Input method selector */}
      <div className="flex bg-muted rounded-lg p-1">
        <button
          onClick={() => setInputMethod('upload')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors flex-1 justify-center ${
            inputMethod === 'upload'
              ? 'bg-background shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Upload className="h-4 w-4" />
          Upload File
        </button>
        <button
          onClick={() => setInputMethod('url')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors flex-1 justify-center ${
            inputMethod === 'url'
              ? 'bg-background shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Link className="h-4 w-4" />
          Image URL
        </button>
      </div>

      {inputMethod === 'upload' ? (
        <div>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragOver
                ? 'border-primary-600 bg-primary-600/5'
                : 'border-border hover:border-primary-600/50'
            } ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}
          >
            <input
              type="file"
              id="image-upload"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              disabled={isLoading}
            />

            {selectedFile ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-3">
                  <ImageIcon className="h-8 w-8 text-primary-600" />
                  <div className="text-left">
                    <p className="font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={clearSelection}
                  className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                  Remove
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <Upload className="h-12 w-12 text-muted-foreground mx-auto" />
                <div>
                  <p className="text-lg font-medium">Drop your image here</p>
                  <p className="text-muted-foreground">or click to browse</p>
                </div>
                <label
                  htmlFor="image-upload"
                  className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors cursor-pointer"
                >
                  Choose File
                </label>
                <p className="text-xs text-muted-foreground">
                  Supports PNG, JPEG, WebP, AVIF, TIFF (max 10MB)
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="image-url" className="text-sm font-medium">
              Image URL
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                id="image-url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="flex-1 px-3 py-2 border border-border rounded-md bg-background"
                disabled={isLoading}
              />
              <button
                onClick={handleUrlSubmit}
                disabled={!imageUrl.trim() || isLoading}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Load
              </button>
            </div>
          </div>

          {imageUrl && (
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium truncate">{imageUrl}</p>
                <button
                  onClick={clearSelection}
                  className="p-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}