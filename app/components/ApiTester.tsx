'use client'

import { useState } from 'react'
import { Play, Copy, Check, AlertCircle } from 'lucide-react'
import ImageUploader from './ImageUploader'

interface ApiParam {
  name: string
  type: string
  required: boolean
  default?: string | number | boolean
  description: string
  options?: string[]
}

interface ApiTesterProps {
  endpoint: string
  title: string
  description: string
  params: ApiParam[]
}

export default function ApiTester({ endpoint, title, description, params }: ApiTesterProps) {
  const [paramValues, setParamValues] = useState<Record<string, any>>({})
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [imageUrl, setImageUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [response, setResponse] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [showResponse, setShowResponse] = useState(false)
  const [copiedCurl, setCopiedCurl] = useState(false)

  const handleParamChange = (paramName: string, value: any) => {
    setParamValues((prev) => ({
      ...prev,
      [paramName]: value,
    }))
  }

  const handleImageSelect = (file: File | null, url?: string) => {
    setSelectedFile(file)
    setImageUrl(url || '')
  }

  const generateCurlCommand = () => {
    let curl = `curl -X POST https://convert.endpnt.dev/api/v1${endpoint} \\\n`
    curl += `  -H "x-api-key: YOUR_API_KEY" \\\n`

    if (selectedFile || imageUrl) {
      if (imageUrl) {
        curl += `  -H "Content-Type: application/json" \\\n`
        curl += `  -d '{\n`
        curl += `    "image_url": "${imageUrl}"`

        Object.entries(paramValues).forEach(([key, value]) => {
          if (value !== undefined && value !== '' && key !== 'image' && key !== 'image_url') {
            curl += `,\n    "${key}": ${typeof value === 'string' ? `"${value}"` : value}`
          }
        })

        curl += `\n  }'`
      } else {
        curl += `  -F "image=@${selectedFile?.name}" \\\n`

        Object.entries(paramValues).forEach(([key, value]) => {
          if (value !== undefined && value !== '' && key !== 'image' && key !== 'image_url') {
            curl += `  -F "${key}=${value}" \\\n`
          }
        })

        curl = curl.replace(/\s+\\\n$/, '')
      }
    }

    return curl
  }

  const runTest = async () => {
    if (!selectedFile && !imageUrl) {
      setError('Please select an image first')
      return
    }

    setIsLoading(true)
    setError(null)
    setResponse(null)

    try {
      const formData = new FormData()

      if (selectedFile) {
        formData.append('image', selectedFile)
      } else if (imageUrl) {
        formData.append('image_url', imageUrl)
      }

      // Add other parameters
      Object.entries(paramValues).forEach(([key, value]) => {
        if (value !== undefined && value !== '' && key !== 'image' && key !== 'image_url') {
          formData.append(key, value.toString())
        }
      })

      const apiResponse = await fetch(`/api/v1${endpoint}`, {
        method: 'POST',
        headers: {
          'x-api-key': 'ek_live_demo123', // Demo API key
        },
        body: formData,
      })

      const result = await apiResponse.json()

      if (!apiResponse.ok) {
        throw new Error(result.error?.message || 'API request failed')
      }

      setResponse(result)
      setShowResponse(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setIsLoading(false)
    }
  }

  const copyCurl = async () => {
    try {
      await navigator.clipboard.writeText(generateCurlCommand())
      setCopiedCurl(true)
      setTimeout(() => setCopiedCurl(false), 2000)
    } catch (err) {
      console.error('Failed to copy: ', err)
    }
  }

  return (
    <div className="space-y-6 border border-border rounded-lg p-6">
      <div className="space-y-2">
        <h3 className="text-xl font-semibold">{title}</h3>
        <p className="text-muted-foreground">{description}</p>
        <code className="inline-block bg-muted px-2 py-1 rounded text-sm">
          POST /api/v1{endpoint}
        </code>
      </div>

      {/* Image Upload */}
      <div className="space-y-4">
        <h4 className="font-medium">Upload Test Image</h4>
        <ImageUploader onImageSelect={handleImageSelect} isLoading={isLoading} />
      </div>

      {/* Parameters */}
      <div className="space-y-4">
        <h4 className="font-medium">Parameters</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {params.map((param) => (
            <div key={param.name} className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                {param.name}
                {param.required && <span className="text-red-500 text-xs">*</span>}
              </label>
              <div className="space-y-1">
                {param.options ? (
                  <select
                    value={paramValues[param.name] || param.default || ''}
                    onChange={(e) => handleParamChange(param.name, e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background"
                  >
                    {!param.required && <option value="">None</option>}
                    {param.options.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : param.type === 'boolean' ? (
                  <select
                    value={paramValues[param.name]?.toString() || param.default?.toString() || 'false'}
                    onChange={(e) => handleParamChange(param.name, e.target.value === 'true')}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background"
                  >
                    <option value="false">false</option>
                    <option value="true">true</option>
                  </select>
                ) : param.type === 'number' ? (
                  <input
                    type="number"
                    value={paramValues[param.name] || param.default || ''}
                    onChange={(e) => handleParamChange(param.name, parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background"
                    placeholder={param.default?.toString()}
                  />
                ) : (
                  <input
                    type="text"
                    value={paramValues[param.name] || param.default || ''}
                    onChange={(e) => handleParamChange(param.name, e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background"
                    placeholder={param.default?.toString()}
                  />
                )}
                <p className="text-xs text-muted-foreground">{param.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={runTest}
          disabled={isLoading || (!selectedFile && !imageUrl)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Play className="h-4 w-4" />
          {isLoading ? 'Testing...' : 'Test API'}
        </button>

        <button
          onClick={copyCurl}
          className="flex items-center gap-2 px-4 py-2 border border-border rounded-md hover:bg-muted transition-colors"
        >
          {copiedCurl ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          Copy cURL
        </button>
      </div>

      {/* cURL Command */}
      <div className="space-y-2">
        <h4 className="font-medium">cURL Command</h4>
        <div className="bg-muted rounded-lg p-4">
          <pre className="text-sm overflow-x-auto">
            <code>{generateCurlCommand()}</code>
          </pre>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
          <div>
            <h4 className="font-medium text-red-800 dark:text-red-300">Error</h4>
            <p className="text-red-700 dark:text-red-400">{error}</p>
          </div>
        </div>
      )}

      {/* Response */}
      {showResponse && response && (
        <div className="space-y-2">
          <h4 className="font-medium">Response</h4>
          <div className="bg-muted rounded-lg p-4">
            <pre className="text-sm overflow-x-auto">
              <code>{JSON.stringify(response, null, 2)}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}