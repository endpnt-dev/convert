# endpnt Image Conversion API — CC Spec (Part 4 of 6)
**Version:** 1.0
**Date:** April 13, 2026
**Author:** Opus (planning only — CC executes all code changes)
**Agent:** Start with architect → then frontend-agent + backend-agent for implementation
**Project:** endpnt.dev — Developer API platform
**Repo:** endpnt-dev/convert

---

## CRITICAL: Environment Setup (READ FIRST)

Before doing ANYTHING, run these commands to ensure you're in the right place:

```bash
cd /mnt/c/Repositories/endpnt/convert
pwd
# Must show: /mnt/c/Repositories/endpnt/convert

git branch
# Must show: * dev
# If not on dev, run: git checkout dev

git status
# Should be clean. If not, stash or commit existing changes.
```

**Git workflow for this project:**
- Work on `dev` branch
- Push to `dev` when done — Vercel auto-deploys a preview URL
- DO push to dev
- JK will review the preview, then open a PR to main on GitHub for production deploy

---

## Overview

Build the Image Conversion API — the fourth of 5 utility APIs for endpnt.dev. This API accepts an image (via upload or URL) and performs format conversion, resizing, compression, cropping, and watermarking. Uses Sharp, the fastest Node.js image processing library.

Use the same architecture patterns from previous APIs. Copy shared scaffolding and adapt.

Deployed at convert.endpnt.dev.

---

## Requirements

1. Accept images via multipart file upload OR image_url parameter
2. Convert between PNG, JPEG, WebP, AVIF, and TIFF formats
3. Resize images with multiple fit modes (cover, contain, fill, inside, outside)
4. Compress images to target quality level
5. Crop images to specific regions or smart-crop to detected subject
6. Add text or image watermarks
7. Strip EXIF/metadata from images
8. Max upload size: 10MB
9. API key auth, rate limiting, standard response format (same as other APIs)
10. GET support not applicable for upload endpoints — POST only for all endpoints
11. Landing page, docs page, pricing page
12. Health check at `/api/v1/health`

---

## Suggestions & Context

### Tech Stack
- **Framework:** Next.js 14+ App Router, TypeScript
- **Image Processing:** `sharp` — uses libvips under the hood, handles all operations natively
- **File Upload:** Next.js built-in request body parsing for multipart/form-data, or `formidable` if needed
- **Rate Limiting:** `@upstash/ratelimit` + `@upstash/redis`
- **Styling:** Tailwind CSS, dark theme

### Folder Structure

```
convert/
  app/
    api/
      v1/
        convert/
          route.ts            ← Format conversion
        resize/
          route.ts            ← Resize with fit modes
        compress/
          route.ts            ← Quality-based compression
        crop/
          route.ts            ← Region or smart crop
        watermark/
          route.ts            ← Text or image watermark
        health/
          route.ts
    page.tsx
    docs/
      page.tsx
    pricing/
      page.tsx
    layout.tsx
    globals.css
  lib/
    auth.ts                   ← Copy from previous APIs
    rate-limit.ts             ← Copy from previous APIs
    response.ts               ← Copy from previous APIs
    image.ts                  ← Shared image processing helpers (load from URL or upload)
    config.ts
  middleware.ts
  package.json
  tsconfig.json
  next.config.js
  tailwind.config.ts
  postcss.config.js
  .env.example
  vercel.json
  README.md
```

### API Endpoints

#### POST /api/v1/convert
Convert image format.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| image | file | Yes* | — | Image as multipart upload. Max 10MB |
| image_url | string | Alt* | — | URL to fetch image from. Alternative to upload |
| output_format | string | Yes | — | "png", "jpeg", "webp", "avif", "tiff" |
| quality | number | No | 80 | Output quality 1-100 (lossy formats only) |
| strip_metadata | boolean | No | true | Remove EXIF data |

#### POST /api/v1/resize
Resize image.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| image / image_url | file/string | Yes | — | Input image |
| width | number | No* | — | Target width in px. At least one of width/height required |
| height | number | No* | — | Target height in px |
| fit | string | No | "cover" | "cover", "contain", "fill", "inside", "outside" |
| output_format | string | No | — | Convert format during resize. Default: same as input |
| quality | number | No | 80 | Output quality |

#### POST /api/v1/compress
Compress image.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| image / image_url | file/string | Yes | — | Input image |
| quality | number | No | 60 | Target quality 1-100 |
| output_format | string | No | — | Default: same as input. JPEG/WebP recommended for best compression |

#### POST /api/v1/crop
Crop image.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| image / image_url | file/string | Yes | — | Input image |
| x | number | No* | — | Left offset in px. Required for manual crop |
| y | number | No* | — | Top offset in px. Required for manual crop |
| width | number | Yes | — | Crop width in px |
| height | number | Yes | — | Crop height in px |
| smart | boolean | No | false | Use Sharp's attention-based smart crop instead of manual x/y |

#### POST /api/v1/watermark
Add watermark.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| image / image_url | file/string | Yes | — | Input image |
| text | string | No* | — | Watermark text. One of text or watermark_url required |
| watermark_url | string | No* | — | URL to watermark image overlay |
| position | string | No | "bottom-right" | "top-left", "top-right", "bottom-left", "bottom-right", "center", "tile" |
| opacity | number | No | 50 | Watermark opacity 1-100 |

**Standard success response (all endpoints):**
```json
{
  "success": true,
  "data": {
    "image": "base64_encoded_output...",
    "format": "webp",
    "width": 800,
    "height": 600,
    "file_size_bytes": 45200,
    "original_size_bytes": 284720,
    "savings_percent": 84.1
  },
  "meta": {
    "request_id": "req_c1d2e3",
    "processing_ms": 120,
    "remaining_credits": 96
  }
}
```

**Error codes:**
- `AUTH_REQUIRED` (401)
- `INVALID_API_KEY` (401)
- `RATE_LIMIT_EXCEEDED` (429)
- `INVALID_PARAMS` (400) — missing required params, invalid values
- `FILE_TOO_LARGE` (400) — exceeds 10MB
- `UNSUPPORTED_FORMAT` (400) — input format not supported
- `IMAGE_FETCH_FAILED` (400) — couldn't download from image_url
- `PROCESSING_FAILED` (500) — Sharp processing error

### Shared Image Loading Helper
Create a `lib/image.ts` helper that both upload and URL-based inputs flow through:

```typescript
// Pseudocode — architect decides exact implementation
async function loadImage(request): Promise<Buffer> {
  // Check if multipart upload
  // OR check for image_url in body
  // Validate size <= 10MB
  // Return Buffer for Sharp to process
}
```

### Landing Page
- Hero: "Convert, resize, and optimize images with one API call"
- Before/after slider showing compression results (original vs optimized)
- Interactive demo: upload an image, choose output format, see the result
- Show file size savings prominently
- Code examples for each endpoint

### Docs Page
- 5 endpoint tabs or sections (convert, resize, compress, crop, watermark)
- Interactive tester per endpoint
- File upload drag-and-drop area
- Parameter reference tables
- Visual examples of fit modes (cover vs contain vs fill)

### Important: Vercel Function Size
Sharp with its libvips dependency adds ~20MB. Configure vercel.json:

```json
{
  "functions": {
    "app/api/v1/convert/route.ts": { "maxDuration": 30, "memory": 1024 },
    "app/api/v1/resize/route.ts": { "maxDuration": 30, "memory": 1024 },
    "app/api/v1/compress/route.ts": { "maxDuration": 30, "memory": 1024 },
    "app/api/v1/crop/route.ts": { "maxDuration": 30, "memory": 1024 },
    "app/api/v1/watermark/route.ts": { "maxDuration": 30, "memory": 1024 }
  }
}
```

---

## DO NOT TOUCH

- Do not modify any files outside `/mnt/c/Repositories/endpnt/convert/`
- Do not touch any other endpnt repos

---

## Edge Cases

1. Uploading a non-image file (PDF, text) — return UNSUPPORTED_FORMAT
2. Uploading an animated GIF — Sharp drops animation, document this limitation
3. Very large image (e.g., 8000x8000) — should still process but may be slow
4. Crop region extends beyond image bounds — clamp to image dimensions
5. Resize with only width — calculate height to maintain aspect ratio
6. Watermark text with special characters / emoji — handle gracefully
7. image_url returning a non-image content type — return IMAGE_FETCH_FAILED
8. AVIF output — Sharp supports it but some older browsers don't display it
9. Requesting quality on PNG (lossless format) — ignore quality param, document why
10. Simultaneous upload + image_url — use upload, ignore URL

---

## Environment Variables

```
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token_here
API_KEYS={"ek_live_74qlNSbK5jTwq28Y":{"tier":"free","name":"Demo Key"}}
NEXT_PUBLIC_SITE_URL=https://convert.endpnt.dev
```

---

## Git Commit & Push

```bash
git add -A && git commit -m "feat: initial Image Conversion API — 5 endpoints, landing page, docs, pricing" && git push origin dev
```

**DO push to dev.**

---

## Smoke Tests

| # | Scenario | Steps | Expected Result | Pass/Fail |
|---|----------|-------|-----------------|-----------|
| 1 | Health check | GET /api/v1/health | Returns { status: "ok" } | |
| 2 | PNG to WebP | POST /api/v1/convert with PNG image, output_format: "webp" | Returns WebP, smaller file size | |
| 3 | Resize by width | POST /api/v1/resize with width: 400 | Returns image resized to 400px wide, aspect ratio maintained | |
| 4 | Resize with fit | POST /api/v1/resize width: 400, height: 400, fit: "contain" | Image fits within 400x400, letterboxed | |
| 5 | Compress JPEG | POST /api/v1/compress with quality: 50 | Returns smaller file, savings_percent > 0 | |
| 6 | Manual crop | POST /api/v1/crop with x:100, y:100, width:200, height:200 | Returns 200x200 cropped region | |
| 7 | Smart crop | POST /api/v1/crop with width:400, height:400, smart:true | Returns cropped image focused on subject | |
| 8 | Text watermark | POST /api/v1/watermark with text: "endpnt.dev" | Returns image with watermark text visible | |
| 9 | Image via URL | POST /api/v1/convert with image_url instead of upload | Works same as file upload | |
| 10 | File too large | Upload >10MB image | Returns 400 FILE_TOO_LARGE | |
| 11 | Missing API key | POST without x-api-key | Returns 401 | |
| 12 | Invalid format | POST /api/v1/convert with output_format: "bmp" | Returns 400 UNSUPPORTED_FORMAT | |
| 13 | Landing page | Visit / | Renders with hero, before/after demo | |
| 14 | Docs page | Visit /docs | Renders with upload tester, endpoint sections | |
| 15 | Metadata stripped | POST with strip_metadata: true, check output | No EXIF data in output image | |
