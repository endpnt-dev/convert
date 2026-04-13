import Link from 'next/link'
import { Image, ArrowLeft, ExternalLink, Check } from 'lucide-react'
import PricingTable from '../components/PricingTable'

export default function PricingPage() {
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
              <Link href="/docs" className="text-muted-foreground hover:text-foreground transition-colors">
                Documentation
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
        {/* Header */}
        <div className="text-center space-y-6 mb-16">
          <h1 className="text-4xl font-bold">Simple, transparent pricing</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose the plan that fits your needs. All plans include our full feature set
            with different usage limits and support levels.
          </p>
        </div>

        {/* Pricing Table */}
        <div className="mb-16">
          <PricingTable />
        </div>

        {/* FAQ */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">What counts as a conversion?</h3>
                <p className="text-muted-foreground">
                  Each API request counts as one conversion, regardless of the operation
                  (format conversion, resize, compress, crop, or watermark).
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">What happens if I exceed my limit?</h3>
                <p className="text-muted-foreground">
                  Your requests will be rate-limited and return a 429 error. You can upgrade
                  your plan or wait for the next billing period.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Do you store uploaded images?</h3>
                <p className="text-muted-foreground">
                  No, we never store your images. They are processed in memory and
                  immediately discarded after the response is sent.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">What image formats are supported?</h3>
                <p className="text-muted-foreground">
                  We support PNG, JPEG, WebP, AVIF, and TIFF as both input and output formats.
                  Most common web image formats are accepted as input.
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">Is there a file size limit?</h3>
                <p className="text-muted-foreground">
                  Yes, the maximum file size is 10MB per image. This ensures fast processing
                  times and prevents abuse.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Can I cancel anytime?</h3>
                <p className="text-muted-foreground">
                  Yes, you can cancel your subscription at any time. You'll continue to have
                  access until the end of your billing period.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Do you offer volume discounts?</h3>
                <p className="text-muted-foreground">
                  Yes, our Enterprise plan includes custom pricing for high-volume usage.
                  Contact our sales team for a personalized quote.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">What's your uptime guarantee?</h3>
                <p className="text-muted-foreground">
                  Pro and Enterprise plans include a 99.9% uptime SLA with service credits
                  for any downtime that exceeds our guarantee.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Features Comparison */}
        <div className="mt-20">
          <h2 className="text-2xl font-bold text-center mb-8">Feature Comparison</h2>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-border rounded-lg">
              <thead>
                <tr className="bg-muted">
                  <th className="border border-border p-4 text-left font-semibold">Feature</th>
                  <th className="border border-border p-4 text-center font-semibold">Free</th>
                  <th className="border border-border p-4 text-center font-semibold">Starter</th>
                  <th className="border border-border p-4 text-center font-semibold">Pro</th>
                  <th className="border border-border p-4 text-center font-semibold">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-border p-4">Monthly conversions</td>
                  <td className="border border-border p-4 text-center">100</td>
                  <td className="border border-border p-4 text-center">5,000</td>
                  <td className="border border-border p-4 text-center">25,000</td>
                  <td className="border border-border p-4 text-center">100,000+</td>
                </tr>
                <tr className="bg-muted/50">
                  <td className="border border-border p-4">Rate limit (per minute)</td>
                  <td className="border border-border p-4 text-center">10</td>
                  <td className="border border-border p-4 text-center">60</td>
                  <td className="border border-border p-4 text-center">300</td>
                  <td className="border border-border p-4 text-center">1,000+</td>
                </tr>
                <tr>
                  <td className="border border-border p-4">All output formats</td>
                  <td className="border border-border p-4 text-center">✗</td>
                  <td className="border border-border p-4 text-center">
                    <Check className="h-5 w-5 text-primary-600 mx-auto" />
                  </td>
                  <td className="border border-border p-4 text-center">
                    <Check className="h-5 w-5 text-primary-600 mx-auto" />
                  </td>
                  <td className="border border-border p-4 text-center">
                    <Check className="h-5 w-5 text-primary-600 mx-auto" />
                  </td>
                </tr>
                <tr className="bg-muted/50">
                  <td className="border border-border p-4">Text watermarking</td>
                  <td className="border border-border p-4 text-center">✗</td>
                  <td className="border border-border p-4 text-center">
                    <Check className="h-5 w-5 text-primary-600 mx-auto" />
                  </td>
                  <td className="border border-border p-4 text-center">
                    <Check className="h-5 w-5 text-primary-600 mx-auto" />
                  </td>
                  <td className="border border-border p-4 text-center">
                    <Check className="h-5 w-5 text-primary-600 mx-auto" />
                  </td>
                </tr>
                <tr>
                  <td className="border border-border p-4">Smart cropping</td>
                  <td className="border border-border p-4 text-center">✗</td>
                  <td className="border border-border p-4 text-center">✗</td>
                  <td className="border border-border p-4 text-center">
                    <Check className="h-5 w-5 text-primary-600 mx-auto" />
                  </td>
                  <td className="border border-border p-4 text-center">
                    <Check className="h-5 w-5 text-primary-600 mx-auto" />
                  </td>
                </tr>
                <tr className="bg-muted/50">
                  <td className="border border-border p-4">Image watermarking</td>
                  <td className="border border-border p-4 text-center">✗</td>
                  <td className="border border-border p-4 text-center">✗</td>
                  <td className="border border-border p-4 text-center">
                    <Check className="h-5 w-5 text-primary-600 mx-auto" />
                  </td>
                  <td className="border border-border p-4 text-center">
                    <Check className="h-5 w-5 text-primary-600 mx-auto" />
                  </td>
                </tr>
                <tr>
                  <td className="border border-border p-4">Priority support</td>
                  <td className="border border-border p-4 text-center">✗</td>
                  <td className="border border-border p-4 text-center">
                    <Check className="h-5 w-5 text-primary-600 mx-auto" />
                  </td>
                  <td className="border border-border p-4 text-center">
                    <Check className="h-5 w-5 text-primary-600 mx-auto" />
                  </td>
                  <td className="border border-border p-4 text-center">
                    <Check className="h-5 w-5 text-primary-600 mx-auto" />
                  </td>
                </tr>
                <tr className="bg-muted/50">
                  <td className="border border-border p-4">SLA guarantee</td>
                  <td className="border border-border p-4 text-center">✗</td>
                  <td className="border border-border p-4 text-center">✗</td>
                  <td className="border border-border p-4 text-center">99.9%</td>
                  <td className="border border-border p-4 text-center">Custom</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-16 space-y-6">
          <h2 className="text-2xl font-bold">Ready to get started?</h2>
          <p className="text-muted-foreground">
            Try our API for free or contact us for Enterprise pricing
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/docs"
              className="inline-flex items-center px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Start Free Trial
            </Link>
            <a
              href="mailto:sales@endpnt.dev"
              className="inline-flex items-center px-6 py-3 border border-border rounded-lg hover:bg-muted transition-colors"
            >
              Contact Sales
            </a>
          </div>
        </div>
      </div>
    </main>
  )
}