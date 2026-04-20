# CLAUDE.md — Convert API Specific Rules

**This file supplements `C:\Repositories\endpnt\CLAUDE.md` (platform-wide rules).** Read both. Universal rules (definition of done, mandatory workflow, agent usage, spec archive procedure, status-report honesty) are in the platform file. Only Convert-specific guidance lives here.

---

## What this API does

Convert handles image format conversion and manipulation. Five routes under `/api/v1/`:

- `convert` — transcode between formats (jpeg, png, webp, avif, tiff)
- `resize` — scale images with fit modes (cover, contain, fill, inside, outside)
- `compress` — lossy compression at configurable quality
- `crop` — manual crop (x, y, w, h) or smart crop (attention-based)
- `watermark` — overlay text or image watermark at a position

Input: multipart `image` file upload OR `image_url` string. Output: base64 image in the standard response envelope.

---

## ⚠️ Known security gaps (as of 2026-04-17)

Two HIGH-severity findings from the `CODE-REVIEW-FINDINGS.md` audit. Tracked for fix in `CC-SPEC-SSRF-FIX.md`:

- **SSRF in `loadImageFromUrl`** (`lib/image.ts`) — no private-IP or hostname blocklist on `image_url` or `watermark_url`. A customer can fetch `http://169.254.169.254/...` (AWS IMDS) through our function. Preview has the correct pattern in `preview/lib/url-utils.ts` — copy it.
- **Unbounded response size** in the same function — only checks `content-length` header, which a malicious server can lie about or omit. Attacker can stream a 900MB response into our 1GB function memory and OOM it.

Until the fix ships, do NOT extend `loadImageFromUrl` or add new URL-fetching features. Any new code path that calls `fetch(userControlledUrl)` inherits both vulnerabilities.

---

## Library Choices

| Library | Purpose | Key gotcha |
|---|---|---|
| `sharp` | All image decode/encode/resize/compress/crop/composite operations | Native bindings — must be externalized per Next 14 rules. `.toBuffer()` returns `Promise<Buffer>`, not `Buffer` — await it. |
| `formidable` | (Imported but UNUSED in current code) | See below — remove. |

### Sharp API — verify before use

Before writing any new sharp call, read `node_modules/sharp/lib/index.d.ts`. Sharp's fluent API is easy to misuse:

- `.toBuffer()` is a Promise. Store as `const buf = await sharp(...).toBuffer()`, never assign without await and then await it at the consumption site (currently happening in `addWatermark` — flagged as M2 in findings).
- `.composite([{ input: Buffer, ... }])` — the `input` MUST be a resolved Buffer, not a Promise<Buffer>.
- `.jpeg({ quality })`, `.webp({ quality })`, `.avif({ quality })` — quality is 1-100, not 0-1.
- `.png()` is lossless — `quality` is ignored there; use `compressionLevel` (0-9) instead.

### formidable is dead code

`lib/image.ts` line 2 imports `formidable` and `{ promises as fs }` but neither is used anywhere. Upload parsing is done via Web API `request.formData()`. Both imports should be removed (flagged as M1 in findings). Do not add formidable back unless there's a specific reason Web API FormData cannot handle — there isn't one.

---

## Next.js Config — FIX REQUIRED

Current `next.config.js` uses `serverExternalPackages: ['sharp']` at the top level. **This is Next 15 syntax and is technically invalid for Next 14.2.15** per the platform CLAUDE.md rules.

It may appear to work because Next 14 is lenient about unknown top-level keys, but the intent (externalize sharp) is not reliably happening. Any future build failure related to sharp bundling likely traces back to this.

Correct Next 14 syntax:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['sharp'],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
  },
}

module.exports = nextConfig
```

Do not convert this file until it's scoped as its own fix task (don't bundle the config fix with an unrelated change).

---

## Reference Repo for This API's Patterns

Convert follows the "file upload API" pattern. When adding a new endpoint or refactoring:

- Copy route scaffolding from existing convert routes (they're consistent — see M4 in findings for the duplication flag)
- Copy SSRF/url-utils patterns from `preview/lib/url-utils.ts` (as soon as the SSRF fix lands)
- For error class patterns, use `qr/lib/errors.ts` (or similar) as a model — current string-based error codes in `lib/image.ts` are fragile (flagged M3)

---

## File Upload Limits

Defined in `lib/config.ts` as `IMAGE_LIMITS`. Current values:

- `max_file_size_bytes` — enforced at multipart parse time AND (attempted) after URL fetch. The URL-fetch enforcement is broken per C2.
- Supported input formats: jpeg, png, webp, avif, tiff, gif, svg
- Supported output formats: jpeg, png, webp, avif, tiff

Multipart uploads go through `request.formData()` and are capped at parse time — that path is safe. URL fetches are NOT safe yet (see SSRF section above).

---

## Route Handler Duplication (tech debt)

All 5 routes (`convert`, `resize`, `compress`, `crop`, `watermark`) duplicate ~80% of the same auth + rate-limit + parse + try/catch boilerplate. This is flagged as M4 in findings.

`validate/lib/api-handler.ts` has the wrapper pattern that solves this. DO NOT refactor the routes to adopt the wrapper as a side effect of another task. When this refactor happens, it gets its own full spec — architect plans, all 5 routes change together, comprehensive smoke tests.

---

## Convert-Specific Error Codes

Beyond platform errors:

- `UNSUPPORTED_FORMAT` (400) — output format not in the supported list
- `INVALID_PARAMS` (400) — missing required fields, invalid combinations
- `FILE_TOO_LARGE` (400) — exceeds `IMAGE_LIMITS.max_file_size_bytes`
- `IMAGE_FETCH_FAILED` (400) — URL fetch failed or returned non-2xx
- `BLOCKED_IMAGE_URL` (400) — **will be added** when SSRF fix lands; private-IP or blocklisted hostname
- `PROCESSING_FAILED` (500) — sharp threw during processing

Currently thrown as `throw new Error('CODE_STRING')` and pattern-matched by the route handler. Fragile — see M3.

---

## Rate-Limit Namespace

Convert uses `rl:convert:{tier}` as the Upstash key prefix. This is correct and matches peer APIs (QR, Preview, Screenshot-after-fix). Do NOT change.

---

## DO NOT TOUCH (Convert-specific)

- `lib/image.ts` `loadImageFromUrl` outside of the SSRF fix spec — it is a known vulnerability and ad-hoc changes make the fix harder
- `lib/config.ts` `IMAGE_LIMITS` — tuned for Vercel 1GB memory limit, lowering them requires coordinated spec
- The 5 route handlers' duplicated boilerplate — refactor is a dedicated spec, not a side task
