import Link from 'next/link'
import { Image, ArrowLeft, ExternalLink } from 'lucide-react'
import ApiTester from '../components/ApiTester'
import CodeBlock from '../components/CodeBlock'

const endpoints = [
  {
    id: 'convert',
    endpoint: '/convert',
    title: 'Convert Format',
    description: 'Convert images between PNG, JPEG, WebP, AVIF, and TIFF formats.',
    params: [
      {
        name: 'output_format',
        type: 'string',
        required: true,
        description: 'Target format: "png", "jpeg", "webp", "avif", or "tiff"',
        options: ['png', 'jpeg', 'webp', 'avif', 'tiff'],
      },
      {
        name: 'quality',
        type: 'number',
        required: false,
        default: 80,
        description: 'Output quality 1-100 (lossy formats only)',
      },
      {
        name: 'strip_metadata',
        type: 'boolean',
        required: false,
        default: true,
        description: 'Remove EXIF and other metadata',
      },
    ],
  },
  {
    id: 'resize',
    endpoint: '/resize',
    title: 'Resize Image',
    description: 'Resize images with various fit modes and optional format conversion.',
    params: [
      {
        name: 'width',
        type: 'number',
        required: false,
        description: 'Target width in pixels (required if height not specified)',
      },
      {
        name: 'height',
        type: 'number',
        required: false,
        description: 'Target height in pixels (required if width not specified)',
      },
      {
        name: 'fit',
        type: 'string',
        required: false,
        default: 'cover',
        description: 'How to fit the image in the target dimensions',
        options: ['cover', 'contain', 'fill', 'inside', 'outside'],
      },
      {
        name: 'output_format',
        type: 'string',
        required: false,
        description: 'Convert format during resize (optional)',
        options: ['png', 'jpeg', 'webp', 'avif', 'tiff'],
      },
      {
        name: 'quality',
        type: 'number',
        required: false,
        default: 80,
        description: 'Output quality 1-100',
      },
    ],
  },
  {
    id: 'compress',
    endpoint: '/compress',
    title: 'Compress Image',
    description: 'Reduce file size while maintaining visual quality.',
    params: [
      {
        name: 'quality',
        type: 'number',
        required: false,
        default: 60,
        description: 'Target quality 1-100',
      },
      {
        name: 'output_format',
        type: 'string',
        required: false,
        description: 'Convert to format optimized for compression (optional)',
        options: ['jpeg', 'webp', 'avif'],
      },
    ],
  },
  {
    id: 'crop',
    endpoint: '/crop',
    title: 'Crop Image',
    description: 'Crop images with manual coordinates or smart attention-based cropping.',
    params: [
      {
        name: 'width',
        type: 'number',
        required: true,
        description: 'Crop width in pixels',
      },
      {
        name: 'height',
        type: 'number',
        required: true,
        description: 'Crop height in pixels',
      },
      {
        name: 'x',
        type: 'number',
        required: false,
        description: 'Left offset in pixels (required for manual crop)',
      },
      {
        name: 'y',
        type: 'number',
        required: false,
        description: 'Top offset in pixels (required for manual crop)',
      },
      {
        name: 'smart',
        type: 'boolean',
        required: false,
        default: false,
        description: 'Use attention-based smart crop instead of manual coordinates',
      },
    ],
  },
  {
    id: 'watermark',
    endpoint: '/watermark',
    title: 'Add Watermark',
    description: 'Add text or image watermarks with customizable positioning and opacity.',
    params: [
      {
        name: 'text',
        type: 'string',
        required: false,
        description: 'Watermark text (required if watermark_url not provided)',
      },
      {
        name: 'watermark_url',
        type: 'string',
        required: false,
        description: 'URL to watermark image (alternative to text)',
      },
      {
        name: 'position',
        type: 'string',
        required: false,
        default: 'bottom-right',
        description: 'Watermark position',
        options: ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center', 'tile'],
      },
      {
        name: 'opacity',
        type: 'number',
        required: false,
        default: 50,
        description: 'Watermark opacity 1-100',
      },
    ],
  },
]

const authExample = `{
  "success": true,
  "data": {
    "image": "base64_encoded_output...",
    "format": "webp",
    "width": 800,
    "height": 600,
    "file_size_bytes": 45200,
    "original_size_bytes": 284720,
    "savings_percent": 84.1
  },
  "meta": {
    "request_id": "req_c1d2e3",
    "processing_ms": 120,
    "remaining_credits": 96
  }
}`

const errorExample = `{
  "success": false,
  "error": {
    "code": "FILE_TOO_LARGE",
    "message": "Image file exceeds 10MB limit"
  }
}`

export default function DocsPage() {
  return (
    <main className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
              <div className="flex items-center gap-2">
                <Image className="h-8 w-8 text-primary-600" />
                <span className="font-bold text-xl">Convert API</span>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-6">
              <Link href="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">
                Pricing
              </Link>
              <a
                href="https://github.com/endpnt-dev"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                GitHub
                <ExternalLink className="h-4 w-4 inline ml-1" />
              </a>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 space-y-6">
              <div>
                <h3 className="font-semibold mb-3">Getting Started</h3>
                <ul className="space-y-2 text-sm">
                  <li>
                    <a href="#authentication" className="text-muted-foreground hover:text-primary-600">
                      Authentication
                    </a>
                  </li>
                  <li>
                    <a href="#base-url" className="text-muted-foreground hover:text-primary-600">
                      Base URL
                    </a>
                  </li>
                  <li>
                    <a href="#responses" className="text-muted-foreground hover:text-primary-600">
                      Response Format
                    </a>
                  </li>
                  <li>
                    <a href="#errors" className="text-muted-foreground hover:text-primary-600">
                      Error Codes
                    </a>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Endpoints</h3>
                <ul className="space-y-2 text-sm">
                  {endpoints.map((endpoint) => (
                    <li key={endpoint.id}>
                      <a
                        href={`#${endpoint.id}`}
                        className="text-muted-foreground hover:text-primary-600"
                      >
                        {endpoint.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-12">
            {/* Introduction */}
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold mb-4">API Documentation</h1>
                <p className="text-muted-foreground text-lg">
                  The Image Conversion API allows you to convert, resize, compress, crop, and watermark images
                  with a simple REST API. All endpoints support both file uploads and image URLs.
                </p>
              </div>

              {/* Base URL */}
              <div id="base-url">
                <h2 className="text-2xl font-semibold mb-3">Base URL</h2>
                <CodeBlock code="https://convert.endpnt.dev/api/v1" language="text" />
              </div>

              {/* Authentication */}
              <div id="authentication">
                <h2 className="text-2xl font-semibold mb-3">Authentication</h2>
                <p className="text-muted-foreground mb-4">
                  All API requests require an API key passed in the <code>x-api-key</code> header.
                </p>
                <CodeBlock code="x-api-key: your_api_key_here" language="text" />
              </div>

              {/* Response Format */}
              <div id="responses">
                <h2 className="text-2xl font-semibold mb-3">Response Format</h2>
                <p className="text-muted-foreground mb-4">
                  All successful responses follow this structure:
                </p>
                <CodeBlock code={authExample} language="json" />
              </div>

              {/* Error Codes */}
              <div id="errors">
                <h2 className="text-2xl font-semibold mb-3">Error Codes</h2>
                <p className="text-muted-foreground mb-4">
                  Error responses include a descriptive error code and message:
                </p>
                <CodeBlock code={errorExample} language="json" />

                <div className="mt-6">
                  <h3 className="font-semibold mb-3">Common Error Codes</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <code>AUTH_REQUIRED</code>
                      <span className="text-muted-foreground">Missing API key (401)</span>
                    </div>
                    <div className="flex justify-between">
                      <code>INVALID_API_KEY</code>
                      <span className="text-muted-foreground">Invalid API key (401)</span>
                    </div>
                    <div className="flex justify-between">
                      <code>RATE_LIMIT_EXCEEDED</code>
                      <span className="text-muted-foreground">Too many requests (429)</span>
                    </div>
                    <div className="flex justify-between">
                      <code>FILE_TOO_LARGE</code>
                      <span className="text-muted-foreground">File exceeds 10MB (400)</span>
                    </div>
                    <div className="flex justify-between">
                      <code>UNSUPPORTED_FORMAT</code>
                      <span className="text-muted-foreground">Invalid image format (400)</span>
                    </div>
                    <div className="flex justify-between">
                      <code>PROCESSING_FAILED</code>
                      <span className="text-muted-foreground">Image processing error (500)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Endpoints */}
            <div className="space-y-12">
              <h2 className="text-2xl font-semibold">Endpoints</h2>

              {endpoints.map((endpoint) => (
                <div key={endpoint.id} id={endpoint.id}>
                  <ApiTester
                    endpoint={endpoint.endpoint}
                    title={endpoint.title}
                    description={endpoint.description}
                    params={endpoint.params}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}