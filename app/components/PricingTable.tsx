import { Check, Zap, Star, Building } from 'lucide-react'

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Perfect for trying out the API',
    icon: Star,
    features: [
      '100 conversions/month',
      '10 requests/minute',
      'PNG, JPEG formats',
      'Basic resize & convert',
      'Community support',
    ],
    limitations: [
      'No watermarking',
      'No smart cropping',
      'Limited output formats',
      'Basic compression only',
    ],
    cta: 'Get Started',
    popular: false,
  },
  {
    name: 'Starter',
    price: '$29',
    period: 'month',
    description: 'Great for small projects and startups',
    icon: Zap,
    features: [
      '5,000 conversions/month',
      '60 requests/minute',
      'All formats (PNG, JPEG, WebP, AVIF)',
      'Advanced resizing & compression',
      'Text watermarking',
      'Manual cropping',
      'Email support',
      'Priority processing',
    ],
    cta: 'Start Free Trial',
    popular: true,
  },
  {
    name: 'Pro',
    price: '$99',
    period: 'month',
    description: 'Perfect for growing businesses',
    icon: Building,
    features: [
      '25,000 conversions/month',
      '300 requests/minute',
      'All formats & features',
      'Smart cropping',
      'Image watermarking',
      'Batch processing',
      'Priority support',
      'Webhook notifications',
      '99.9% uptime SLA',
    ],
    cta: 'Start Free Trial',
    popular: false,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: 'pricing',
    description: 'For high-volume applications',
    icon: Building,
    features: [
      '100,000+ conversions/month',
      '1,000+ requests/minute',
      'All features included',
      'Custom processing pipeline',
      'White-label API',
      'Dedicated infrastructure',
      'Custom SLA',
      'Dedicated support',
      'Priority processing',
    ],
    cta: 'Contact Sales',
    popular: false,
  },
]

export default function PricingTable() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {plans.map((plan) => (
        <div
          key={plan.name}
          className={`relative rounded-lg border p-6 bg-background shadow-sm ${
            plan.popular
              ? 'border-primary-600 ring-2 ring-primary-600/20'
              : 'border-border'
          }`}
        >
          {plan.popular && (
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <div className="bg-primary-600 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                <Zap className="h-3 w-3" />
                Most Popular
              </div>
            </div>
          )}

          <div className="text-center">
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-lg bg-primary-600/10">
              <plan.icon className="h-6 w-6 text-primary-600" />
            </div>

            <h3 className="text-xl font-semibold">{plan.name}</h3>
            <p className="text-sm text-muted-foreground mt-2 mb-4">
              {plan.description}
            </p>

            <div className="mb-6">
              <span className="text-3xl font-bold">{plan.price}</span>
              {plan.period !== 'pricing' && (
                <span className="text-muted-foreground">/{plan.period}</span>
              )}
            </div>

            <button
              className={`w-full py-3 px-4 rounded-md font-medium transition-colors ${
                plan.popular
                  ? 'bg-primary-600 text-white hover:bg-primary-700'
                  : plan.name === 'Enterprise'
                  ? 'border border-border hover:bg-muted'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              {plan.cta}
            </button>
          </div>

          <div className="mt-8">
            <h4 className="text-sm font-medium mb-3">Features included:</h4>
            <ul className="space-y-2">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary-600 mt-0.5 flex-shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            {plan.limitations && (
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2 text-muted-foreground">
                  Not included:
                </h4>
                <ul className="space-y-1">
                  {plan.limitations.map((limitation) => (
                    <li
                      key={limitation}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <span className="text-muted-foreground">•</span>
                      <span>{limitation}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}