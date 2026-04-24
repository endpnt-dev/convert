# BUGS.md — Convert API Bug Tracker

**Scope:** Bugs specific to the Convert API (`convert.endpnt.dev`). Cross-cutting bugs live at `../BUGS.md`.

**ID prefix:** `C-NNN` (sequential, do not reuse).

**Last updated:** 2026-04-24 (biweekly audit: C-001, C-002, C-004, C-005 resolved; C-008 added).

---

## Open bugs

### C-003 — Request body consumed twice in upload route

- **Severity:** Medium (demo is broken; production API works)
- **File:** Convert upload route handler (verify exact path when picking up the fix)
- **Discovered:** Pre-2026-04-24 (captured in userMemories as "Convert API: file upload demo broken (request body consumed twice in route handler)")
- **Symptom:** File upload demo on `convert.endpnt.dev` returns an error when a user uploads an image. The route handler is calling a body-read method (e.g., `request.formData()` or `request.arrayBuffer()`) twice — the second call fails because the body stream is already consumed.
- **Root cause:** Likely a refactor that added a validation step reading the body, then forgot the downstream handler also reads it.
- **Impact:** Demo is unusable for file uploads. Production API (with `x-api-key`) may or may not have the same issue — needs verification. Landing-page demo is a marketing surface; this makes Convert look broken to prospective users.
- **Fix approach:** Locate the route. Capture the body once into a local `Buffer` or `FormData` object. Pass the captured object to downstream logic instead of the original `Request`. Add a smoke test that runs the demo flow end-to-end.
- **Status:** Open. Not a launch blocker (production API still works), but visible on the landing page.

### C-006 — Route handler boilerplate duplication

- **Severity:** Low (tech debt)
- **Files:** All 5 routes under `app/api/v1/` (convert, resize, compress, crop, watermark)
- **Discovered:** 2026-04-17 (flagged M4 in `CODE-REVIEW-FINDINGS.md`)
- **Symptom:** The 5 route handlers duplicate ~80% of auth + rate-limit + parse + try/catch boilerplate.
- **Impact:** A change to auth or rate-limit semantics requires 5 parallel edits. Drift between routes is likely (one route evolves, others don't).
- **Fix approach:** Adopt the `createApiHandler` wrapper pattern from `validate/lib/api-handler.ts`. All 5 routes refactored together. Not a side-task — dedicated spec with comprehensive smoke tests covering each route before/after.
- **Status:** Open. Deferred post-launch. No active spec.

### C-007 — String-based error codes in `lib/image.ts`

- **Severity:** Low (fragility)
- **File:** `lib/image.ts` (throws) + route handler (catches and pattern-matches)
- **Discovered:** 2026-04-17 (flagged M3 in `CODE-REVIEW-FINDINGS.md`)
- **Symptom:** Errors are thrown as `throw new Error('CODE_STRING')` and the route handler uses string comparison to pick the right HTTP status.
- **Impact:** Typos in either the throw or the compare silently break error handling. Refactors that rename a code must update both ends.
- **Fix approach:** Introduce a typed error class (see `qr/lib/errors.ts` pattern). Each thrown error has a `.code` property and the route handler switches on it. TypeScript enforces consistency.
- **Status:** Open. Bundle with C-006 (same spec).

### C-009 — Debug `console.log` statements in production code

- **Severity:** Low (logging hygiene — may leak internal state in Vercel logs)
- **File:** `lib/image.ts` (exact line TBD — verify during fix)
- **Discovered:** 2026-04-24 (biweekly code health audit)
- **Symptom:** Debug `console.log` statements are present in production code paths, likely in `lib/image.ts` around the image processing pipeline. These were likely added during the SSRF fix work (commit `091517b`) or the multipart investigation and never removed.
- **Impact:** Console.log output appears in Vercel function logs, potentially leaking internal state, URL values, or processing details. Verbose logs also add minor latency and cost to Vercel's log volume.
- **Fix approach:** Search `lib/image.ts` and route handlers for `console.log` calls (as distinct from `console.error`). Remove any that are debug-only. Keep `console.error` for genuine error paths if they exist.
- **Status:** Open. Low priority — verify exact location and remove during next convert session.

### C-008 — Live API key committed in `CC-FOLLOWUP-V1-MULTIPART-BUG.md`

- **Severity:** High (security — key must be treated as compromised)
- **File:** `CC-FOLLOWUP-V1-MULTIPART-BUG.md` line 33
- **Discovered:** 2026-04-24 (biweekly code health audit)
- **Symptom:** The string `ek_live_hoWnzx74NUf04esiG8pv` appears in a curl example inside `CC-FOLLOWUP-V1-MULTIPART-BUG.md`, which is committed to git history. Per platform CLAUDE.md API key hygiene rules, any key value that has ever been committed to git must be treated as compromised.
- **Root cause:** The key was embedded in a debugging/followup doc without sanitizing it to a placeholder value first.
- **Impact:** Any person with read access to the git repo can extract the key. Pre-launch this is lower risk (repo likely private), but the key should still be rotated before any public access.
- **Fix approach:**
  1. Rotate the compromised key via `./scripts/generate-api-key.sh` and update `API_KEYS` in Vercel for all affected projects.
  2. Optionally redact the committed file (git history rewrite is complex and may not be worth the disruption — focus on rotation instead).
  3. Add a note to the file header that the key shown is revoked.
- **Status:** Open. High priority — rotate before launch.

---

## Resolved bugs

### C-001 — SSRF in `loadImageFromUrl`

- **Originally:** High (launch blocker), discovered 2026-04-17
- **Resolved:** 2026-04-20
- **Resolution commit:** `091517b`
- **Resolution spec:** `docs/specs/archive/DONE-CC-SPEC-SSRF-FIX.md` (archived)
- **What changed:** `isSSRFProtected()` added to `lib/url-utils.ts`, called before each fetch hop in `loadImageFromUrl`. `redirect: 'manual'` set with post-redirect re-validation. `BLOCKED_IMAGE_URL` error code added.
- **Verification:** Audit 2026-04-24 confirmed `isSSRFProtected(currentUrl)` is called at lines 78 and 99 of `lib/image.ts`, `redirect: 'manual'` is set, redirect re-validation is in place.

### C-002 — Unbounded response size in `loadImageFromUrl`

- **Originally:** High (launch blocker), discovered 2026-04-17
- **Resolved:** 2026-04-20
- **Resolution commit:** `091517b` (bundled with C-001 fix)
- **Resolution spec:** Same SSRF fix spec
- **What changed:** Streaming byte-counting implemented via `ReadableStream` reader with manual chunk accumulation. Aborts at `IMAGE_LIMITS.max_file_size_bytes`.
- **Verification:** Audit 2026-04-24 confirmed streaming reader pattern visible in `lib/image.ts` at line ~118. Content-length header trust removed.

### C-004 — Dead `formidable` import in `lib/image.ts`

- **Originally:** Low, discovered 2026-04-17
- **Resolved:** Date unknown (prior to audit 2026-04-24)
- **Resolution commit:** Not tracked — import confirmed removed by audit 2026-04-24
- **What changed:** `formidable` and `{ promises as fs }` imports removed from `lib/image.ts`. `lib/image.ts` line 1 is now `import sharp from 'sharp'` with no formidable reference.
- **Verification:** Audit 2026-04-24 confirmed no formidable import present in current code.

### C-005 — Next 15 config syntax in `next.config.js`

- **Originally:** Medium, discovered 2026-04-17
- **Resolved:** Date unknown (prior to audit 2026-04-24)
- **Resolution commit:** `3a006f8` (per audit finding)
- **What changed:** `serverExternalPackages: ['sharp']` at top level replaced with `experimental.serverComponentsExternalPackages: ['sharp']` (correct Next 14 syntax).
- **Verification:** Audit 2026-04-24 confirmed `next.config.js` uses `experimental.serverComponentsExternalPackages`. No top-level `serverExternalPackages` present.
