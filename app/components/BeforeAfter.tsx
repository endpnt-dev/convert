'use client'

import { useState } from 'react'
import Image from 'next/image'

interface BeforeAfterProps {
  beforeImage: string
  afterImage: string
  beforeLabel?: string
  afterLabel?: string
  beforeSize?: number
  afterSize?: number
  className?: string
}

export default function BeforeAfter({
  beforeImage,
  afterImage,
  beforeLabel = 'Original',
  afterLabel = 'Converted',
  beforeSize,
  afterSize,
  className = '',
}: BeforeAfterProps) {
  const [sliderPosition, setSliderPosition] = useState(50)
  const [isDragging, setIsDragging] = useState(false)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return

    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100))
    setSliderPosition(percentage)
  }

  const handleMouseDown = () => {
    setIsDragging(true)
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return ''
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + sizes[i]
  }

  const getSavingsPercent = () => {
    if (beforeSize && afterSize && beforeSize > 0) {
      return Math.round(((beforeSize - afterSize) / beforeSize) * 100)
    }
    return null
  }

  const savingsPercent = getSavingsPercent()

  return (
    <div className={`space-y-4 ${className}`}>
      <div
        className="relative aspect-video bg-muted rounded-lg overflow-hidden cursor-col-resize"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Before image */}
        <div className="absolute inset-0">
          <Image
            src={beforeImage}
            alt={beforeLabel}
            fill
            className="object-cover"
            unoptimized
          />
          <div className="absolute top-4 left-4 bg-black/70 text-white px-2 py-1 rounded text-sm">
            {beforeLabel}
          </div>
        </div>

        {/* After image with clip path */}
        <div
          className="absolute inset-0"
          style={{
            clipPath: `polygon(${sliderPosition}% 0%, 100% 0%, 100% 100%, ${sliderPosition}% 100%)`,
          }}
        >
          <Image
            src={afterImage}
            alt={afterLabel}
            fill
            className="object-cover"
            unoptimized
          />
          <div className="absolute top-4 right-4 bg-black/70 text-white px-2 py-1 rounded text-sm">
            {afterLabel}
          </div>
        </div>

        {/* Slider handle */}
        <div
          className="absolute top-0 bottom-0 w-1 bg-white cursor-col-resize"
          style={{ left: `${sliderPosition}%` }}
        >
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center">
            <div className="w-3 h-3 border-l-2 border-r-2 border-gray-400"></div>
          </div>
        </div>
      </div>

      {/* File size comparison */}
      {beforeSize && afterSize && (
        <div className="flex justify-between items-center text-sm bg-muted rounded-lg p-4">
          <div className="space-y-1">
            <div className="text-muted-foreground">Original</div>
            <div className="font-medium">{formatFileSize(beforeSize)}</div>
          </div>

          <div className="text-center space-y-1">
            {savingsPercent && savingsPercent > 0 && (
              <>
                <div className="text-primary-600 font-semibold text-lg">
                  -{savingsPercent}%
                </div>
                <div className="text-xs text-muted-foreground">savings</div>
              </>
            )}
          </div>

          <div className="space-y-1 text-right">
            <div className="text-muted-foreground">Optimized</div>
            <div className="font-medium">{formatFileSize(afterSize)}</div>
          </div>
        </div>
      )}
    </div>
  )
}