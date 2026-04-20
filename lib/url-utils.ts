import { BLOCKED_DOMAINS, BLOCKED_IP_RANGES } from './config'

export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    // Add protocol check inside isValidUrl to reject dangerous protocols
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false
    }
    return true
  } catch {
    return false
  }
}

export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url)
    // Remove fragment and normalize
    parsed.hash = ''
    return parsed.toString()
  } catch {
    return url
  }
}

export function isSSRFProtected(url: string): boolean {
  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname.toLowerCase()

    // Check protocol - reject file://, javascript:, etc.
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false
    }

    // Check blocked domains
    if (BLOCKED_DOMAINS.includes(hostname)) {
      return false
    }

    // Check for obvious private IPs
    if (hostname === '0.0.0.0' || hostname.startsWith('127.') || hostname.startsWith('192.168.')) {
      return false
    }

    // Check for IPv6 localhost
    if (hostname === '::1' || hostname === '[::1]') {
      return false
    }

    // Check for private network patterns
    const privatePatterns = [
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[01])\./,
      /^192\.168\./,
      /^169\.254\./, // AWS metadata service
    ]

    for (const pattern of privatePatterns) {
      if (pattern.test(hostname)) {
        return false
      }
    }

    return true
  } catch {
    return false
  }
}

export function resolveUrl(url: string, baseUrl: string): string {
  try {
    return new URL(url, baseUrl).toString()
  } catch {
    return url
  }
}

export function extractDomainFromUrl(url: string): string {
  try {
    const parsed = new URL(url)
    return parsed.hostname
  } catch {
    return ''
  }
}