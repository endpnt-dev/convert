/**
 * Demo proxy configuration for origin-based access control
 *
 * Phase 5b of demo-proxy standardization: convert API migration
 * per architect plan for Phase 5b execution
 */

export const ALLOWED_ORIGINS = [
  'https://convert.endpnt.dev',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
]

export type AllowedOrigin = string