'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

interface CodeBlockProps {
  code: string
  language?: string
  filename?: string
}

export default function CodeBlock({ code, language = 'bash', filename }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  return (
    <div className="relative">
      {filename && (
        <div className="bg-muted px-4 py-2 rounded-t-lg border-b border-border">
          <span className="text-sm font-mono text-muted-foreground">{filename}</span>
        </div>
      )}
      <div className="relative bg-muted rounded-lg overflow-hidden">
        <pre className="p-4 overflow-x-auto text-sm">
          <code className={`language-${language} font-mono text-foreground`}>
            {code}
          </code>
        </pre>
        <button
          onClick={copyToClipboard}
          className="absolute top-4 right-4 p-2 rounded-md bg-background/80 backdrop-blur-sm border border-border hover:bg-muted transition-colors"
          aria-label="Copy code"
        >
          {copied ? (
            <Check className="h-4 w-4 text-primary-600" />
          ) : (
            <Copy className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </div>
    </div>
  )
}