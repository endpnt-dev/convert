> **⚠️ Security note (2026-04-24):** This file previously contained a live API key literal (C-008). The key has been revoked and is no longer active. Curl examples use `YOUR_API_KEY` — substitute a key retrieved from Vercel env.

# CC-FOLLOWUP-V1-MULTIPART-BUG.md

**Status:** Open (discovered during Phase 5b of CC-SPEC-DEMO-PROXY-STANDARDIZATION.md)

## Bug Summary

Convert's `/api/v1/convert` endpoint is broken for multipart form uploads due to double body stream reading, violating Web Fetch API constraints.

## Root Cause

In `convert/app/api/v1/convert/route.ts`:

1. **Line 63:** `const body = await parseRequestBody(request)` calls `request.formData()` to parse form fields
2. **Line 76:** `const { input, originalMetadata } = await loadAndValidateImage(request, body)` passes the same `request` object
3. **Inside `loadAndValidateImage`:** calls `parseImageFromRequest(request)` which attempts `request.formData()` again
4. **Web Fetch API violation:** Request body streams can only be read once - second call throws
5. **Error swallowed:** `parseImageFromRequest` has try/catch that returns null on error
6. **Result:** `loadAndValidateImage` throws "INVALID_PARAMS" because no image found

## Evidence

Both demo proxy and direct v1 calls fail identically:

```bash
# Through demo proxy
curl -X POST https://convert.endpnt.dev/api/demo/convert \
  -H "Referer: https://convert.endpnt.dev/" \
  -F "image=@test.jpg" -F "output_format=webp"
# → {"success":false,"error":{"code":"INVALID_PARAMS",...}}

# Direct to v1 (bypassing demo proxy entirely)  
curl -X POST https://convert.endpnt.dev/api/v1/convert \
  -H "x-api-key: YOUR_API_KEY" \
  -F "image=@test.jpg" -F "output_format=webp"
# → {"success":false,"error":{"code":"INVALID_PARAMS",...}}
```

Same error proves the bug is in v1's handler, not the demo proxy.

## Impact

- **Severity:** HIGH - multipart uploads completely broken on primary endpoint
- **Affects:** All v1/convert multipart requests (file uploads)
- **Does NOT affect:** JSON requests with `image_url` parameter
- **Workaround:** Use `image_url` with publicly accessible images instead of file uploads

## Fix Strategy

Two approaches:

### Option A: Fix parseImageFromRequest to accept parsed FormData
- Modify `parseImageFromRequest` to accept `FormData` object instead of `Request`
- Pass `formData` from `parseRequestBody` to `loadAndValidateImage` 
- Update `loadAndValidateImage` call chain to use parsed data

### Option B: Consolidate body parsing
- Move all body parsing (both form fields AND file extraction) into single function
- Eliminate duplicate `request.formData()` calls
- Return both parsed fields and file in one pass

## Related Files

- `convert/app/api/v1/convert/route.ts` - main handler with double read
- `convert/lib/process.ts` - `parseRequestBody`, `loadAndValidateImage`  
- `convert/lib/image.ts` - `parseImageFromRequest`
- Other v1 routes (resize, crop, compress, watermark) likely have same bug

## Discovery Context

Found during Phase 5b multipart pilot testing of demo proxy standardization. The demo proxy forwarding is working correctly - this is a pre-existing v1 route bug that affects any multipart caller.

## Next Steps

1. Create dedicated fix spec for v1 multipart body parsing
2. Test other v1 routes for same double-read pattern  
3. Add integration test for multipart upload flow
4. Consider API contract review (should v1 accept both multipart AND JSON?)