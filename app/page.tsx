import Link from 'next/link'
import { Image, Zap, Settings, Crop, Palette, ArrowRight, Code, Github, Shield } from 'lucide-react'
import dynamic from 'next/dynamic'
import CodeBlock from './components/CodeBlock'

// Import ImageDemo with no SSR to avoid hydration issues
const ImageDemo = dynamic(() => import('./components/ImageDemo'), { ssr: false })

const features = [
  {
    icon: Image,
    title: 'Format conversion',
    description: 'Convert between PNG, JPEG, WebP, AVIF, and TIFF with one API call'
  },
  {
    icon: Zap,
    title: 'Smart compression',
    description: 'Reduce file sizes by up to 90% while maintaining visual quality'
  },
  {
    icon: Crop,
    title: 'Intelligent cropping',
    description: 'Smart crop with attention detection or precise manual control'
  },
  {
    icon: Settings,
    title: 'Advanced resizing',
    description: 'Multiple fit modes: cover, contain, fill, inside, and outside'
  },
  {
    icon: Palette,
    title: 'Watermarking',
    description: 'Add text or image watermarks with customizable positioning'
  },
  {
    icon: Shield,
    title: 'Privacy focused',
    description: 'Images are processed and immediately discarded - never stored'
  }
]

const codeExamples = {
  curl: `curl -X POST https://convert.endpnt.dev/api/v1/convert \\
  -H "x-api-key: your_api_key" \\
  -F "image=@photo.jpg" \\
  -F "output_format=webp" \\
  -F "quality=80"`,

  javascript: `const formData = new FormData()
formData.append('image', file)
formData.append('output_format', 'webp')
formData.append('quality', 80)

const response = await fetch('/api/v1/convert', {
  method: 'POST',
  headers: { 'x-api-key': 'your_api_key' },
  body: formData
})

const result = await response.json()
console.log('Savings:', result.data.savings_percent + '%')`,

  python: `import requests

files = {'image': open('photo.jpg', 'rb')}
data = {
    'output_format': 'webp',
    'quality': 80
}

response = requests.post(
    'https://convert.endpnt.dev/api/v1/convert',
    headers={'x-api-key': 'your_api_key'},
    files=files,
    data=data
)

result = response.json()
print(f"Savings: {result['data']['savings_percent']}%")`,
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Image className="h-8 w-8 text-primary-600" />
              <span className="font-bold text-xl">Convert API</span>
            </div>

            <div className="hidden md:flex items-center gap-6">
              <Link href="/docs" className="text-muted-foreground hover:text-foreground transition-colors">
                Documentation
              </Link>
              <Link href="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">
                Pricing
              </Link>
              <a
                href="https://github.com/endpnt-dev"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Github className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-6xl font-bold tracking-tight">
                Convert, resize, and optimize
                <span className="text-primary-600"> images</span>
                <br />
                with one API call
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Fast, reliable image processing API with format conversion, intelligent compression,
                smart cropping, and watermarking. Reduce file sizes by up to 90% while maintaining quality.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/docs"
                className="inline-flex items-center px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <a
                href="#demo"
                className="inline-flex items-center px-6 py-3 border border-border rounded-lg hover:bg-muted transition-colors"
              >
                Try Demo
                <Code className="ml-2 h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-muted/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="space-y-2">
              <div className="text-3xl font-bold text-primary-600">&lt;100ms</div>
              <div className="text-muted-foreground">Average processing time</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-primary-600">90%</div>
              <div className="text-muted-foreground">File size reduction</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-primary-600">5</div>
              <div className="text-muted-foreground">Supported formats</div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Demo */}
      <section id="demo" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-3xl font-bold">Try it yourself</h2>
            <p className="text-muted-foreground">
              Upload an image and see the conversion in action. No API key required for the demo.
            </p>
          </div>

          <ImageDemo />
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-muted/50 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl font-bold">Powerful image processing</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Everything you need to process, optimize, and transform images at scale
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature) => (
              <div key={feature.title} className="bg-background rounded-lg p-6 shadow-sm border border-border">
                <div className="flex items-center gap-4 mb-3">
                  <div className="p-2 bg-primary-600/10 rounded-lg">
                    <feature.icon className="h-6 w-6 text-primary-600" />
                  </div>
                  <h3 className="font-semibold">{feature.title}</h3>
                </div>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Code Examples */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl font-bold">Simple to integrate</h2>
            <p className="text-muted-foreground">
              Get started in minutes with our simple REST API
            </p>
          </div>

          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="text-xl font-semibold">cURL</h3>
                <CodeBlock code={codeExamples.curl} language="bash" />
              </div>
              <div className="space-y-4">
                <h3 className="text-xl font-semibold">JavaScript</h3>
                <CodeBlock code={codeExamples.javascript} language="javascript" />
              </div>
            </div>
            <div className="max-w-3xl mx-auto space-y-4">
              <h3 className="text-xl font-semibold text-center">Python</h3>
              <CodeBlock code={codeExamples.python} language="python" />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary-950 text-white px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h2 className="text-3xl font-bold">Ready to get started?</h2>
            <p className="text-primary-100 text-lg">
              Join thousands of developers using our image processing API
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/docs"
              className="inline-flex items-center px-6 py-3 bg-white text-primary-950 rounded-lg hover:bg-primary-50 transition-colors font-medium"
            >
              Start Building
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center px-6 py-3 border border-primary-700 text-white rounded-lg hover:bg-primary-900 transition-colors"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <Image className="h-6 w-6 text-primary-600" />
              <span className="font-semibold">Convert API</span>
              <span className="text-muted-foreground">by endpnt.dev</span>
            </div>

            <div className="flex items-center gap-6">
              <Link href="/docs" className="text-muted-foreground hover:text-foreground transition-colors">
                Documentation
              </Link>
              <Link href="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">
                Pricing
              </Link>
              <a
                href="https://github.com/endpnt-dev"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                GitHub
              </a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}