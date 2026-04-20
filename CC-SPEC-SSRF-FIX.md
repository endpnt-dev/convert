# Convert API — SSRF Protection + Bounded Response Size (CC Spec)
**Version:** 1.0
**Date:** April 20, 2026
**Author:** Opus (planning only — CC executes via agents)
**Scope:** `convert` repo only
**Priority:** HIGH — real exploitable vulnerability
**Addresses:** CODE-REVIEW-FINDINGS.md items C1, C2, and P1

---

## ⚠️ Before starting

Read `C:\Repositories\endpnt\CLAUDE.md` (platform), `C:\Repositories\endpnt\convert\CLAUDE.md` (repo-specific), and `C:\Repositories\endpnt\convert\CODE-REVIEW-FINDINGS.md` (full audit).

Key non-negotiables:
- Launch `architect` FIRST — this spec involves security-critical code and architect must plan the approach
- `review-qa-agent` BEFORE commit — for a security fix, QA review is especially important
- `npm run build` exit 0 before push
- Honest status reporting including full agent trail

This spec assumes the housekeeping sweep (`CC-SPEC-HOUSEKEEPING-SWEEP.md`) has already completed. If it hasn't, do that first — `convert/.gitignore` must exist before this fix commits. If it's missing, HALT and escalate.

---

## Overview

The Convert API's `lib/image.ts` `loadImageFromUrl` function has three issues that combine into an exploitable Server-Side Request Forgery (SSRF) vulnerability plus an unbounded-response-size DoS risk.

**Attack scenario (verified reproducible in review):**

A customer sends `POST /api/v1/convert` with body `{"image_url": "http://169.254.169.254/latest/meta-data/iam/security-credentials/"}`. Our Vercel serverless function dutifully fetches that URL, which on a hypothetical cloud host would return AWS IAM credentials. Our function then tries to parse the response as an image (fails), throws `IMAGE_FETCH_FAILED`, but the outbound fetch already happened and the response bytes sat in our function's memory. Similar exposure exists for internal services (`10.x`, `172.16-31.x`, `192.168.x`), localhost (`127.x`), IPv6 private ranges, and user-supplied hostnames that resolve to private IPs after DNS lookup.

**Compounding issue (C2):** Even without SSRF, a malicious server can omit or lie about `Content-Length` and stream a 900MB response into our function. The current code buffers the entire response body before the size check runs.

**Hygiene issue (P1):** Was addressed by the housekeeping sweep — convert now has `.gitignore`. Verify it exists before this spec commits, but no action in this spec.

Preview API (`preview/lib/url-utils.ts` and `preview/lib/unfurl.ts`) has the correct pattern. **This spec is primarily a pattern-transplant from Preview to Convert**, not a novel implementation.

---

## Current State

### Vulnerability entry points

Every Convert route that accepts a URL flows through `loadImageFromUrl` in `lib/image.ts`:

- `POST /api/v1/convert` with `image_url` parameter
- `POST /api/v1/resize` with `image_url` parameter
- `POST /api/v1/compress` with `image_url` parameter
- `POST /api/v1/crop` with `image_url` parameter
- `POST /api/v1/watermark` with `image_url` parameter
- `POST /api/v1/watermark` with `watermark_url` parameter (second entry point in the same request)

That last one is notable: a single watermark request can trigger TWO outbound fetches to attacker-controlled URLs — the image being watermarked AND the watermark itself.

### Current `loadImageFromUrl` implementation

Located in `lib/image.ts`, roughly lines 70-105:

```typescript
export async function loadImageFromUrl(url: string): Promise<ImageInput> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'endpnt.dev Image Converter Bot 1.0'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`)
    }

    const contentLength = response.headers.get('content-length')
    if (contentLength && parseInt(contentLength) > IMAGE_LIMITS.max_file_size_bytes) {
      throw new Error('FILE_TOO_LARGE')
    }

    const buffer = Buffer.from(await response.arrayBuffer())

    if (buffer.length > IMAGE_LIMITS.max_file_size_bytes) {
      throw new Error('FILE_TOO_LARGE')
    }

    // ... format detection and return
  } catch (error) {
    if (error instanceof Error && error.message === 'FILE_TOO_LARGE') {
      throw error
    }
    throw new Error('IMAGE_FETCH_FAILED')
  }
}
```

**What's wrong:**

1. No hostname/IP check before the fetch. Private IPs, localhost, link-local metadata endpoints — all allowed.
2. No redirect validation. Default fetch follows redirects automatically. A server at a public IP can `302` to a private IP and our function obediently follows.
3. The `content-length` header is trusted. A server can omit it (chunked transfer), misreport it, or use trailers — all bypass the pre-fetch size check.
4. `await response.arrayBuffer()` buffers the entire response before the post-hoc size check runs. By the time we know the response is too big, we've already consumed the bandwidth and RAM.

### Preview's working pattern (reference)

Located in `preview/lib/url-utils.ts`:

```typescript
export function isSSRFProtected(url: string): boolean {
  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname.toLowerCase()

    if (BLOCKED_DOMAINS.includes(hostname)) return false
    if (hostname === '0.0.0.0' || hostname.startsWith('127.') || hostname.startsWith('192.168.')) return false
    if (hostname === '::1' || hostname === '[::1]') return false

    const privatePatterns = [
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[01])\./,
      /^192\.168\./,
      /^169\.254\./,
    ]
    for (const pattern of privatePatterns) {
      if (pattern.test(hostname)) return false
    }
    return true
  } catch {
    return false
  }
}
```

And `preview/lib/config.ts` exports `BLOCKED_DOMAINS` and `BLOCKED_IP_RANGES` constants.

Preview's `unfurl.ts` uses `redirect: 'manual'` on the fetch and re-runs `isSSRFProtected` on every redirect target.

**Important caveat about Preview's implementation:** it checks the hostname string, but does NOT resolve DNS to catch the case where `evil.com` resolves to `10.0.0.5`. This is a known residual risk — a more complete SSRF fix would use `dns.lookup()` and check the resolved IP. For now, Convert inherits the same level of protection Preview has. A future platform-wide SSRF hardening spec can address DNS-resolution-based bypasses.

---

## Requirements

1. A new `lib/url-utils.ts` in the convert repo exports `isSSRFProtected(url: string): boolean` matching Preview's behavior
2. New constants `BLOCKED_DOMAINS` and `BLOCKED_IP_RANGES` in `lib/config.ts`, matching Preview's values
3. `loadImageFromUrl` validates URLs against `isSSRFProtected` BEFORE fetching — returns `BLOCKED_IMAGE_URL` error if fails
4. `loadImageFromUrl` uses `redirect: 'manual'` and re-validates the Location header on each redirect (up to a max of 5)
5. `loadImageFromUrl` streams the response body and aborts when bytes read exceeds `IMAGE_LIMITS.max_file_size_bytes`, rather than buffering then checking
6. New error code `BLOCKED_IMAGE_URL` (400) is defined and returned for SSRF failures
7. `watermark` route's `watermark_url` fetch flows through the same protected `loadImageFromUrl` — should happen automatically since watermark calls `loadImageFromUrl`
8. A timeout of 10 seconds is applied to the fetch to prevent slowloris-style attacks (Preview has this; Convert should match)
9. All 5 Convert routes continue working normally with legitimate URLs after the change
10. M1 (dead imports in `lib/image.ts`) is cleaned up as part of this spec since we're already in the file — remove `import formidable from 'formidable'` and `import { promises as fs } from 'fs'`

---

## Suggestions & Context

### Approach architect should consider

**Step 1: Port url-utils**

Copy `preview/lib/url-utils.ts` into `convert/lib/url-utils.ts` verbatim. It's self-contained and has no convert-specific dependencies. Adjust the import in the new file to reference `./config` instead of wherever Preview imports from.

**Step 2: Add SSRF config constants**

Add to `convert/lib/config.ts`:

```typescript
// SSRF protection — private IP ranges to block
export const BLOCKED_IP_RANGES = [
  '127.0.0.0/8',
  '10.0.0.0/8',
  '172.16.0.0/12',
  '192.168.0.0/16',
  '169.254.0.0/16',
  '224.0.0.0/4',
  '240.0.0.0/4',
  'fc00::/7',
  'fe80::/10',
  '::1/128',
]

export const BLOCKED_DOMAINS = [
  'localhost',
  '0.0.0.0',
]
```

(The `BLOCKED_IP_RANGES` array is informational — current `isSSRFProtected` uses regex patterns on the hostname, not CIDR matching. The array is kept for future hardening and documentation. Do NOT delete it.)

**Step 3: Add new error code**

In `convert/lib/config.ts`, add `BLOCKED_IMAGE_URL` to the error codes enum/constants. Then the route handlers' error-code-to-HTTP-status mapping needs an entry for it.

**Step 4: Rewrite `loadImageFromUrl`**

Architect should consider this shape (pseudocode — architect owns the final implementation):

```typescript
import { isSSRFProtected } from './url-utils'

const MAX_REDIRECTS = 5
const FETCH_TIMEOUT_MS = 10000

export async function loadImageFromUrl(url: string): Promise<ImageInput> {
  let currentUrl = url
  let redirectCount = 0

  while (redirectCount <= MAX_REDIRECTS) {
    if (!isSSRFProtected(currentUrl)) {
      throw new Error('BLOCKED_IMAGE_URL')
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

    let response: Response
    try {
      response = await fetch(currentUrl, {
        headers: { 'User-Agent': 'endpnt.dev Image Converter Bot 1.0' },
        redirect: 'manual',
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeout)
    }

    // Handle redirects manually so we can re-validate
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')
      if (!location) throw new Error('IMAGE_FETCH_FAILED')
      currentUrl = new URL(location, currentUrl).toString()
      redirectCount++
      continue
    }

    if (!response.ok) throw new Error('IMAGE_FETCH_FAILED')

    // Stream-check size — abort at the limit, don't buffer-then-check
    const maxBytes = IMAGE_LIMITS.max_file_size_bytes
    const chunks: Uint8Array[] = []
    let total = 0
    const reader = response.body?.getReader()
    if (!reader) throw new Error('IMAGE_FETCH_FAILED')

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) {
        total += value.byteLength
        if (total > maxBytes) {
          await reader.cancel()
          throw new Error('FILE_TOO_LARGE')
        }
        chunks.push(value)
      }
    }

    const buffer = Buffer.concat(chunks)
    const contentType = response.headers.get('content-type') || ''
    const format = detectImageFormatFromMime(contentType)

    return { buffer, format, size: buffer.length }
  }

  // Exceeded redirect budget
  throw new Error('TOO_MANY_REDIRECTS')
}
```

Notes on this approach:

- `redirect: 'manual'` is the key to SSRF safety on redirects. Default `'follow'` behavior leaks through private IPs after a redirect.
- `AbortController` with a setTimeout is the standard Node/Web API timeout pattern. No third-party library needed.
- Reading the body via `response.body.getReader()` is Web API streaming. Each chunk is size-checked as it arrives. When total exceeds the limit, we cancel the reader and throw. The bytes already read are still in memory but are bounded at ~64KB (the default chunk size) + whatever we'd accumulated.
- The loop re-validates the URL on every redirect before fetching the next URL. This is the SSRF-safe pattern.

**Step 5: Add `TOO_MANY_REDIRECTS` error code**

If architect adopts the approach above, `TOO_MANY_REDIRECTS` becomes a new error code. Add it to `config.ts` and the route error mapping. If architect chooses a different approach (e.g., using undici with built-in `maxRedirections`), this may not be needed.

**Step 6: Clean up dead imports (M1 from findings)**

In `lib/image.ts`, remove these two imports at the top of the file:

```typescript
// DELETE these — nothing in the file uses them:
import formidable from 'formidable'
import { promises as fs } from 'fs'
```

This is a gimme while we're already touching the file. Saves future confusion.

**Step 7: Verify route error mappings**

Every convert route has a try/catch that maps error messages to HTTP status codes. Find those mappings (they use `.includes(errorCode)` checks per M3 in findings — yes, it's fragile, but fixing that's out of scope for this spec). Add `BLOCKED_IMAGE_URL` and `TOO_MANY_REDIRECTS` to whichever bucket returns 400.

---

## Key Discoveries

1. **All 5 Convert routes pipe through `loadImageFromUrl`** — fixing the one function is sufficient for complete coverage. No per-route changes needed to the fix logic.

2. **Watermark has TWO fetch paths per request** — one for the image being watermarked, one for the watermark image itself. Both must be protected. Both already call `loadImageFromUrl`, so the fix flows through automatically.

3. **Preview's SSRF check is hostname-only, not DNS-resolved** — Convert inherits the same limitation. This is acceptable for v1 of the fix; a stronger platform-wide SSRF hardening (DNS-resolve + check IP) can come later.

4. **Formidable is imported but not used** — can be cleaned up as part of this spec since we're in the file (M1 in findings). Architect should decide whether to also remove `formidable` from `package.json` — probably yes, but it's a separate minor decision.

5. **M2, M3, M4, M5 findings from CODE-REVIEW-FINDINGS are NOT in scope for this spec** — only C1, C2, and (via the housekeeping sweep) P1 are addressed. Other findings await their own specs.

6. **Convert's `.gitignore` must exist before this spec commits** — handled by the housekeeping sweep spec. Verify before starting.

---

## Agent Workflow (MANDATORY)

This is a full spec involving security-critical code changes in a widely-used library function. Agent usage is the full loop.

### Phase 1: Planning

**Launch:** `architect` agent

Architect should:

- Read this spec, CODE-REVIEW-FINDINGS.md, convert/CLAUDE.md, preview/lib/url-utils.ts, preview/lib/config.ts
- Produce a file-by-file implementation plan: which files are touched, what changes, what order
- Evaluate the streaming-read approach vs. alternatives (undici with maxRedirections, cross-fetch, etc.) — suggest if there's a cleaner option
- Confirm the `BLOCKED_IMAGE_URL` and `TOO_MANY_REDIRECTS` error codes are distinct and the HTTP status mapping is right
- Flag any concern about aborting the read mid-stream (no concerns expected, but architect verifies)

If architect flags a concern, STOP and escalate to JK. Do not silently deviate from the approach.

### Phase 2: Implementation

Architect delegates to `backend-agent`.

Files expected to change:

- `lib/url-utils.ts` (NEW)
- `lib/config.ts` (add constants + error codes)
- `lib/image.ts` (rewrite `loadImageFromUrl`, remove dead imports)
- `app/api/v1/convert/route.ts` (error mapping update)
- `app/api/v1/resize/route.ts` (error mapping update)
- `app/api/v1/compress/route.ts` (error mapping update)
- `app/api/v1/crop/route.ts` (error mapping update)
- `app/api/v1/watermark/route.ts` (error mapping update)

No other files should be touched. If architect identifies a need to touch more files, escalate first.

### Phase 3: Review (NON-NEGOTIABLE)

**Launch:** `review-qa-agent`

For a security fix, QA should specifically verify:

- `isSSRFProtected` is called BEFORE `fetch`, not after
- `redirect: 'manual'` is used on the fetch
- Redirect re-validation re-runs `isSSRFProtected` on the Location URL
- Stream-read aborts at the byte limit, not after
- No dead code paths bypass the check (e.g., no legacy `fetch(url)` call somewhere that sneaks past)
- `grep -rn "fetch(" lib/ app/` for any fetch call that doesn't go through `loadImageFromUrl` and might need its own SSRF check
- Error codes map to the right HTTP statuses
- The timeout doesn't leak via unclosed AbortController signal
- Formidable is removed from imports AND from `package.json` (if architect decided that)
- Dead `fs` import is removed

### Phase 4: Build

```bash
npm run build
```

Must exit 0. Zero TypeScript errors. No new warnings.

### Phase 5: Commit and Push

```bash
git add -A
git commit -m "fix: add SSRF protection and bounded response size to loadImageFromUrl"
git push origin main
```

### Phase 6: Smoke Tests

See table below. Some tests require hitting live URLs that simulate attack patterns — a test server is needed. If one isn't already available, architect can spin a trivial one up in `tests/` for this purpose OR skip tests that need one and report which tests are unverified.

### Phase 7: Archive the spec

Per platform CLAUDE.md archive rule:

- Rename `CC-SPEC-SSRF-FIX.md` to `DONE-CC-SPEC-SSRF-FIX.md`
- Append Completion Record footer
- Move to `docs/specs/archive/`
- Update `docs/specs/archive/README.md` to list this entry
- Also update `CODE-REVIEW-FINDINGS.md` to mark C1, C2, and P1 as addressed (or archive it too if every finding is now handled — review remaining findings and decide)
- Commit the archive move separately: `docs: archive CC-SPEC-SSRF-FIX — completed 2026-04-XX`

---

## DO NOT TOUCH

- `lib/image.ts` functions OTHER than `loadImageFromUrl` and the dead imports — the other functions (convertImage, resizeImage, compressImage, cropImage, addWatermark) are working and not in scope
- `IMAGE_LIMITS.max_file_size_bytes` value — tuned to Vercel memory; changing it is a separate decision
- The multipart upload parsing path (`parseImageFromRequest`) — it's already safe via `request.formData()` and is not a SSRF vector
- Any file outside `convert/` — no cross-repo changes in this spec
- `lib/rate-limit.ts` — not related to this fix
- Error codes OTHER than `BLOCKED_IMAGE_URL` and `TOO_MANY_REDIRECTS` — don't renumber or rename existing codes
- The route handlers' core logic — only the error-code-to-HTTP-status mapping changes, not the request flow

---

## Edge Cases

1. **URL is not a valid URL at all** (e.g., `"not a url"`) — `isSSRFProtected` returns `false` (the `try/catch` around `new URL()` catches parse errors). Result: `BLOCKED_IMAGE_URL`. User-friendly but lumps two different problems under one code. Acceptable for v1.

2. **URL uses a non-http(s) scheme** (e.g., `file:///etc/passwd`, `gopher://`, `javascript:`) — `isSSRFProtected` needs to reject these. Preview does this via `isValidUrl` as a sibling check. Convert should add the same check (protocol must be `http:` or `https:`). Architect should include this in the implementation. If it's not already in Preview's `isSSRFProtected`, add it explicitly.

3. **Redirect chain terminates with non-2xx** — handled by the `if (!response.ok)` check after the redirect loop. Returns `IMAGE_FETCH_FAILED`.

4. **Redirect to a different protocol** (e.g., http → https) — fine, `new URL(location, currentUrl)` resolves correctly.

5. **Redirect to a relative path** (e.g., `Location: /other`) — `new URL(location, currentUrl)` handles this.

6. **Fetch timeout fires** — AbortController throws `AbortError`. Caught by the outer try/catch, mapped to `IMAGE_FETCH_FAILED`. Acceptable. (Could be `TIMEOUT` as a distinct code, but keeping surface minimal.)

7. **Response body is empty** (e.g., 204 No Content with an image URL) — stream-read loop exits immediately, `buffer.length === 0`. Downstream sharp will reject as invalid image. Returns `PROCESSING_FAILED` naturally. Acceptable.

8. **Response is chunked transfer encoding** — the stream-read approach handles this correctly (reading chunks). The old `content-length`-based check broke here.

9. **User submits two URLs in a watermark request, one blocked** — the `image_url` fetch happens first; if it's blocked, the watermark URL is never fetched. Early-return semantics. Good.

10. **Legit public CDN** (e.g., `https://images.unsplash.com/photo-xyz`) — passes all checks, fetches normally. No regression.

---

## Smoke Tests

Run against the deployed `https://convert.endpnt.dev` after Vercel deploys green.

### Setup: retrieve a valid API key from Vercel

Per platform CLAUDE.md "API Keys for Smoke Tests" rule, do NOT use a hardcoded key. Before running the smoke tests below:

```bash
cd /mnt/c/Repositories/endpnt/convert
vercel env pull --environment=production .env.runtime
source .env.runtime
DEMO_KEY=$(echo $API_KEYS | jq -r 'keys[0]')
echo "Retrieved key, length: ${#DEMO_KEY}"
```

If `vercel` CLI is not installed or authenticated, STOP and report it as a blocker. One-time setup:
```bash
npm i -g vercel
vercel login
vercel link   # in this repo
```

If `jq` is not installed: `sudo apt-get install jq` (or equivalent). Without it, parse manually from the JSON.

After the tests complete, remove the retrieved env file:
```bash
rm .env.runtime
```

### The tests

Run against the deployed `https://convert.endpnt.dev` after Vercel deploys green.

| # | Scenario | Command | Expected | Pass/Fail |
|---|----------|---------|----------|-----------|
| 1 | Legit public image URL still works | `curl -X POST https://convert.endpnt.dev/api/v1/convert -H "x-api-key: $DEMO_KEY" -H "Content-Type: application/json" -d '{"image_url":"https://images.unsplash.com/photo-1682687220742-aba13b6e50ba","output_format":"webp"}'` | HTTP 200, base64 webp image in response | |
| 2 | Blocked: localhost | `curl ... -d '{"image_url":"http://localhost/foo.png","output_format":"webp"}'` | HTTP 400, `BLOCKED_IMAGE_URL` | |
| 3 | Blocked: AWS metadata endpoint | `curl ... -d '{"image_url":"http://169.254.169.254/latest/meta-data/","output_format":"webp"}'` | HTTP 400, `BLOCKED_IMAGE_URL` | |
| 4 | Blocked: private class A | `curl ... -d '{"image_url":"http://10.0.0.5/image.png","output_format":"webp"}'` | HTTP 400, `BLOCKED_IMAGE_URL` | |
| 5 | Blocked: private class B | `curl ... -d '{"image_url":"http://172.16.0.1/image.png","output_format":"webp"}'` | HTTP 400, `BLOCKED_IMAGE_URL` | |
| 6 | Blocked: private class C | `curl ... -d '{"image_url":"http://192.168.1.1/image.png","output_format":"webp"}'` | HTTP 400, `BLOCKED_IMAGE_URL` | |
| 7 | Blocked: link-local | `curl ... -d '{"image_url":"http://169.254.1.1/image.png","output_format":"webp"}'` | HTTP 400, `BLOCKED_IMAGE_URL` | |
| 8 | Blocked: IPv6 loopback | `curl ... -d '{"image_url":"http://[::1]/image.png","output_format":"webp"}'` | HTTP 400, `BLOCKED_IMAGE_URL` | |
| 9 | Blocked: file:// scheme | `curl ... -d '{"image_url":"file:///etc/passwd","output_format":"webp"}'` | HTTP 400, `BLOCKED_IMAGE_URL` | |
| 10 | Blocked: javascript: scheme | `curl ... -d '{"image_url":"javascript:alert(1)","output_format":"webp"}'` | HTTP 400, `BLOCKED_IMAGE_URL` | |
| 11 | Multipart upload unaffected | `curl -X POST -F "image=@test.jpg" -F "output_format=webp" -H "x-api-key: $DEMO_KEY" https://convert.endpnt.dev/api/v1/convert` | HTTP 200, base64 webp | |
| 12 | Watermark with blocked image_url | `curl ... /watermark -d '{"image_url":"http://169.254.169.254/","watermark_url":"https://example.com/wm.png"}'` | HTTP 400, `BLOCKED_IMAGE_URL` (never reaches watermark fetch) | |
| 13 | Watermark with blocked watermark_url | `curl ... /watermark -d '{"image_url":"https://images.unsplash.com/...","watermark_url":"http://10.0.0.5/wm.png"}'` | HTTP 400, `BLOCKED_IMAGE_URL` | |
| 14 | Oversized response aborted | Test with a URL that returns a 100MB response (a test server; if unavailable, skip and report as unverified) | HTTP 400, `FILE_TOO_LARGE` in reasonable time (under 15s) | |
| 15 | Redirect to private IP blocked | Test URL that 302s to `http://10.0.0.5/` (test server; skip if unavailable) | HTTP 400, `BLOCKED_IMAGE_URL` | |
| 16 | Legit redirect followed | Test URL that 301s to another public image (e.g., `http://images.example.com` → `https://cdn.example.com`) | HTTP 200 | |
| 17 | Too many redirects | Test URL with 6+ redirects (test server; skip if unavailable) | HTTP 400, `TOO_MANY_REDIRECTS` (or `IMAGE_FETCH_FAILED` depending on architect's choice) | |
| 18 | Timeout fires | URL that hangs forever (test server; skip if unavailable) | HTTP 4xx/5xx within ~11 seconds | |
| 19 | grep check — no bare fetch | `grep -rn "fetch(" lib/ app/ \| grep -v loadImageFromUrl` | Zero external-URL fetch calls outside the protected function | |
| 20 | grep check — formidable removed | `grep -rn "formidable" lib/ app/` | Zero matches (imports and package removed) | |

Tests 14, 15, 17, 18 require a test server. If none is available, mark them "unverified — requires test harness" in the status report and propose adding a tests/ssrf-harness as a follow-up. Do not invent a passing result.

---

## Status Report Required

```
Status: [COMPLETE | BLOCKED]

Agents invoked:
- architect: [yes/no] — [approach confirmation, any concerns raised]
- backend-agent: [yes/no] — [files changed, summary of edits]
- review-qa-agent: [yes/no] — [findings, each one addressed? yes/no per finding]

Build:
- npm run build: exit 0 | exit N
- TypeScript errors: [count, specific files]
- New warnings: [yes/no, list]

Deployment:
- Commit hash: [hash]
- Pushed to: main
- Vercel: green | red | pending

Smoke tests: X of 20 passing
- Passing: [list of test numbers]
- Failing: [list of test numbers with reason]
- Unverified (need test harness): [list of test numbers]

Security-specific verification:
- isSSRFProtected called before every fetch: yes/no
- redirect: 'manual' used: yes/no
- Redirect re-validation in place: yes/no
- Stream-read size check (not buffer-then-check): yes/no
- No bare fetch() to user URLs remaining outside loadImageFromUrl: yes/no (per Test 19)
- formidable removed from package.json: yes/no

Out-of-scope findings still open:
- M2 (watermark buffer naming): [still open]
- M3 (ConvertError class): [still open]
- M4 (handler wrapper): [still open]
- CODE-REVIEW-FINDINGS.md: [updated with C1/C2/P1 marked addressed? yes/no]

Spec archive:
- DONE-CC-SPEC-SSRF-FIX.md created with footer: yes/no
- Moved to docs/specs/archive/: yes/no
- Archive README updated: yes/no
- Archive commit pushed: [hash]
```

---

## What comes next (not in this session)

1. **Remaining Convert findings** — M2, M3, M4, M5 from CODE-REVIEW-FINDINGS get their own cleanup spec
2. **Platform-wide SSRF audit** — verify QR and Screenshot have SSRF protection on their URL inputs (currently unknown; Convert's fix suggests the pattern)
3. **DNS-resolution-based SSRF hardening** — current fix is hostname-only; a stronger version resolves DNS and checks the resulting IP. Platform-wide scope.
4. **Test harness for SSRF scenarios** — if smoke tests 14, 15, 17, 18 are unverified, add a `tests/ssrf-harness/` with a small Express server that simulates redirects, oversized responses, timeouts. Useful across Convert, Preview, and future URL-fetching APIs.
