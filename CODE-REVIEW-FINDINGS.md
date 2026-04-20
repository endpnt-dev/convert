# Convert API — Code Review Findings (endpnt-dev/convert)
**Reviewed by:** Opus (Claude chat) — cross-repo code review
**Date:** April 17, 2026
**Scope reviewed:** `app/api/v1/*` (all 5 routes), `lib/*`, root files

**Status update (2026-04-20):** C1 (SSRF vulnerability), C2 (unbounded response size), and P1 (.gitignore) addressed via CC-SPEC-SSRF-FIX.md implementation.

---

## Critical issues

### C1 — SSRF vulnerability in `loadImageFromUrl` (exploitable)
**File:** `lib/image.ts` (function `loadImageFromUrl`, lines ~66-100)

Convert accepts an `image_url` parameter across every image-operation route (convert, resize, compress, crop, watermark). The handler passes the URL directly to `fetch()` with no SSRF protection:

```ts
export async function loadImageFromUrl(url: string): Promise<ImageInput> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'endpnt.dev Image Converter Bot 1.0'
      }
    })
    ...
  }
}
```

No private IP check. No hostname blocklist. No redirect validation.

**Impact:** A customer can submit `{"image_url":"http://169.254.169.254/latest/meta-data/iam/security-credentials/"}` and your serverless function will fetch AWS IMDS credentials, try to parse them as an image, fail, and potentially leak the response bytes through error messages. Same exposure applies to:
- Internal services (`http://10.0.0.x/...`)
- Localhost (`http://127.0.0.1:PORT/...`) — though unlikely to be reachable on Vercel
- Link-local (`http://169.254.169.254/...`) — cloud metadata endpoints
- Internal DNS (`http://internal-api.endpnt.dev/...`) — if you ever add private services

Additionally, `watermark_url` (in `addWatermark`) also calls `loadImageFromUrl` — so that's a second SSRF entry point per request. Watermark URL even more worrying: a user could submit an image URL AND a watermark URL, giving TWO outbound fetches per request, one to attack and one as cover.

**Severity: HIGH.** This is the kind of bug that becomes a CVE in public disclosure. Preview (`lib/url-utils.ts` + `lib/unfurl.ts`) has the fix pattern — reuse it.

**Recommended fix:**
1. Copy Preview's `isSSRFProtected` function (and its BLOCKED_IP_RANGES / BLOCKED_DOMAINS config) into Convert's `lib/url-utils.ts`.
2. Call `isSSRFProtected(url)` at the top of `loadImageFromUrl` — reject with `BLOCKED_IMAGE_URL` error code if it fails.
3. Use `redirect: 'manual'` in the fetch call and re-check `isSSRFProtected` after each redirect (exactly how Preview handles it).
4. Consider enforcing a max response size at the body level, not just via content-length header (same issue Preview has per Preview's S2 finding).

### C2 — No file size check before `fetch()` consumes arbitrary response
**File:** `lib/image.ts` `loadImageFromUrl` (lines ~75-90)

```ts
const response = await fetch(url, { ... })
const contentLength = response.headers.get('content-length')
if (contentLength && parseInt(contentLength) > IMAGE_LIMITS.max_file_size_bytes) {
  throw new Error('FILE_TOO_LARGE')
}
const buffer = Buffer.from(await response.arrayBuffer())
```

This check relies entirely on the server's declared `content-length` header. A malicious server can lie about content-length or omit it entirely (especially with chunked transfer encoding), and then stream an unlimited response. `await response.arrayBuffer()` buffers the entire thing into memory before the post-hoc size check on line ~88.

On Vercel, a serverless function with a 1-GB memory limit hit with a 900MB image fetch will OOM and crash. A few parallel attacks of this pattern could DOS your function.

**Recommended fix:** Use `response.body` as a ReadableStream and accumulate bytes while tracking the total, aborting when exceeding `IMAGE_LIMITS.max_file_size_bytes`. Or use a library like `undici` that supports max-size-bounded fetches natively.

---

## Correctness issues

### M1 — `formidable` imported but not used
**File:** `lib/image.ts` (line 2)

```ts
import formidable from 'formidable'
import { promises as fs } from 'fs'
```

Neither `formidable` nor `fs` is referenced anywhere in the file. The actual upload parsing uses Web API's `FormData` via `request.formData()`. These imports add bundle size and suggest dead code.

**Recommended fix:** Remove unused imports.

### M2 — Watermark image buffer used before `await`
**File:** `lib/image.ts` (lines ~273-282 in `addWatermark`)

```ts
const watermarkBuffer = sharp(watermarkInput.buffer)
  .modulate({ lightness: 1, saturation: 1 })
  .png({ palette: true })
  .toBuffer()
...
pipeline = pipeline.composite([{
  input: await watermarkBuffer,  // <-- await on a non-variable "Promise<Buffer>"
  ...
}])
```

`watermarkBuffer` is declared as the result of `.toBuffer()` (which returns `Promise<Buffer>`). It's assigned but never awaited at declaration — the `await` happens only inside the `composite()` call. This works because JS allows awaiting a Promise stored in a variable, but the naming is misleading (it's a Promise<Buffer>, not a Buffer) and the data flow is hard to read.

Also: `.modulate({ lightness: 1, saturation: 1 })` with those values is a no-op — lightness=1, saturation=1 are identity transforms. Remove.

**Recommended fix:** Assign `watermarkBuffer = await sharp(...).toBuffer()` directly. Remove the no-op modulate call.

### M3 — Error messages from internal strings thrown as code identifiers
**File:** `lib/image.ts` (multiple places), `lib/process.ts`, `app/api/v1/*/route.ts`

The code uses `throw new Error('UNSUPPORTED_FORMAT')` with the error code itself as the message. Then in the route handler:

```ts
const errorCode = error.message as any
if (['INVALID_PARAMS', 'FILE_TOO_LARGE', 'UNSUPPORTED_FORMAT', 'IMAGE_FETCH_FAILED', 'PROCESSING_FAILED'].includes(errorCode)) {
```

This is fragile. A typo in the thrown string or a genuine human-readable error that happens to contain one of these codes in its message would bypass the intended error handling. Other APIs use custom error classes (QR's `QRValidationError`, Preview's `UnfurlError`) which is more robust.

**Recommended fix:** Introduce a `ConvertError` class with a `code` field — throw `new ConvertError('UNSUPPORTED_FORMAT', 'Detailed message')` and check `error instanceof ConvertError` in handlers.

### M4 — Five nearly-identical route handlers duplicate 50+ lines each
**Files:** `app/api/v1/{convert,resize,compress,crop,watermark}/route.ts`

Every route has the same auth + rate-limit + parse + try/catch boilerplate, with about 80% identical code. The only varying parts are:
1. Which validator functions to call on the body
2. Which operation function to invoke (`convertImage`, `resizeImage`, etc.)

Validate API solves this with a `createApiHandler` wrapper in `lib/api-handler.ts`. Convert could benefit from the same pattern — but is NOT required to adopt it immediately. Flagging as tech debt.

**Recommended fix:** During the Cipher-inspired polish pass, refactor Convert routes to use a shared handler wrapper similar to Validate's pattern.

### M5 — Convert does not implement a `/health` endpoint check content
**File:** `app/api/v1/health/route.ts` (not read, but exists per directory tree)

I didn't open this file but noted the directory exists. Spot-check that it follows the same shape as the other APIs' health checks.

### M6 — `watermark` and `convert` routes don't support GET
**Files:** All Convert routes accept POST only.

QR, Screenshot, Preview all accept both GET and POST. Convert is the only API that requires POST-only. Reasonable for file uploads but limits the usability for `image_url` callers who'd like to embed a conversion URL directly.

**Recommended fix (optional):** For routes that only accept `image_url` (no file upload), add GET support. Watermark with a text parameter + image URL could work as a GET request.

---

## Polish / consistency issues

### P1 — Missing `.gitignore` file
**Observation from earlier review:** Convert is missing a `.gitignore` at the repo root.

Every other repo has one. Confirmed via `read_multiple_files` attempt — got `ENOENT` for `C:\Repositories\endpnt\convert\.gitignore`.

**Risk:** Without a `.gitignore`, if anyone runs `git add .` in this repo, they could commit `node_modules/`, `.next/`, `.env`, or `.env.local` accidentally. The `.env.local` file exists somewhere on disk and could be swept in.

**Recommended fix:** Add a `.gitignore` matching the pattern of sister repos (I'd recommend QR's version as the template — it's the most complete). This is HIGH priority — gitignore omission is how accidental secret leaks happen.

### P2 — Rate-limit namespace correct (`rl:convert:{tier}`)
No fix needed. Flagging for completeness.

### P3 — Inconsistent import style (default vs named)
**File:** `lib/image.ts` imports `sharp` as default, `formidable` as default, but `fs` as named `{ promises as fs }`.

Personal preference, not a bug. Just noting.

### P4 — No rate-limit info in response headers (body only)
Convert uses `meta.remaining_credits` in response body, Validate uses `X-RateLimit-*` headers. Platform-wide inconsistency — not Convert's fault individually.

---

## Security considerations

### S1 — See C1 (SSRF in image_url and watermark_url) — this IS the top security issue
Highest priority finding in this review.

### S2 — See C2 (unbounded response size) — DoS risk
High priority.

### S3 — Sharp library handles malicious image files safely in general, but...
Sharp has a good security record but has had vulnerabilities in the past (CVE-2023-4863 for libwebp, which affected Sharp). Keep the `sharp` version up to date. Check `package.json` for pinned version.

### S4 — No rate limit on UPLOAD size distinct from fetched URL size
Multipart uploads enforce `IMAGE_LIMITS.max_file_size_bytes` at parse time, which is correct. But the `content-length` check on fetched URLs (see C2) has the bypass described above. So uploads are safer than URL fetches in Convert's current code.

### S5 — `User-Agent` header identifies the bot — appropriate
`'endpnt.dev Image Converter Bot 1.0'` is a reasonable bot UA. Sites can choose to block if they want. No issue.

---

## Suggested fix specs (priority ordered)

1. **C1 — SSRF protection.** FULL spec required. Copy Preview's `url-utils.ts` pattern into Convert. Highest priority security item. 45-60 min of focused work.
2. **P1 — Add `.gitignore`.** 2-minute fix. Do this TONIGHT if possible — having no .gitignore in a live public repo is an ongoing risk.
3. **C2 — Bounded response size.** Full spec. Could be combined with C1 into a single SSRF+sizing spec since they're in the same function.
4. **M3 — `ConvertError` class.** Refactor error handling for robustness. Medium spec.
5. **M1, M2 — Clean up dead imports, fix watermark buffer naming.** Batch into cleanup micro spec.
6. **M4 — Shared handler wrapper.** Larger refactor, defer to post-Cipher polish pass.

---

## Review notes for CC review-qa-agent

When running CC's `review-qa-agent` on Convert:

1. **Priority #1: verify C1 and C2.** Open `lib/image.ts` and confirm the SSRF + size bypass described. These are real bugs, not theoretical. Reproduce them locally with a test fetch against `http://169.254.169.254` if on a cloud instance, or against a local HTTP server that lies about content-length.
2. **Write smoke tests targeting the SSRF case.** Add to Convert's test suite: submit `{image_url:"http://localhost:8080/anything"}` or similar — should receive `BLOCKED_IMAGE_URL` after the fix.
3. **Sharp version check.** Run `npm audit` and report any Sharp-related CVEs.
4. **Verify `.gitignore` presence.** If missing, create it before any other changes. This is the first commit.
5. **Check `lib/image.ts` for other unused imports** beyond `formidable` and `fs` — suggest a full cleanup pass while the file is open.
6. **Confirm Convert's routes all work as intended** — run the smoke tests against the live `convert.endpnt.dev` after any fixes land.
