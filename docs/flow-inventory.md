# ArtHQ flow inventory and repair evidence

Every retained route and action below is backed by the Express API. Firebase Authentication issues identity tokens; the API verifies revocation and enforces ownership/admin claims. Firestore is accessible through the server only.

| Screen or action | API and persistence | Important boundaries | Verification |
| --- | --- | --- | --- |
| Home, services, process | `/api/site`, `/api/content`; business settings and published content | Private packages and disabled socials excluded | Desktop/mobile navigation, dialogs, keyboard and axe checks |
| Work and project detail | `/api/content`, `/api/content/:slug`; `content` | Published only; wrong-section redirects | All portfolio entries and three viewport widths |
| Insights, search, reports, detail | Same content APIs; `content` | Drafts hidden by slug; filters combine; missing pages differ from outages | API publication tests and browser publish/read/unpublish journey |
| Contact | POST `/api/contact`; `inquiries` | Consent, field validation, honeypot, throttling | Success and failure/retry browser journeys; API persistence tests |
| Sign-in, registration, Google login, reset | Firebase Auth SDK | Whitelisted return paths; fresh tokens; admin claims checked by server | Mocked browser identity; real emulator token verification and access denial |
| Email verification and community entry | Firebase Auth; `/api/messages` | Verified email required to post; explicit sign-in refresh after verifying | API verified-email checks; emulator identity |
| Private Geraki, popup and full page | POST `/api/geraki/chat`; session history in browser tab | Strict roles/context, no privileged tools, shared quotas, bounded provider fallback | Real model probes; provider unit tests; context, retry, clear and focus browser tests |
| Brief and booking | POST `/api/orders`; `orders` | Published package/service match, signed-in email, consent, payment readiness | API validation/ownership tests; browser package/brief journey |
| Customer projects | GET `/api/orders`; cursor-paged `orders` | Owner filtering applied in the database; cancellation and milestones reflected | Cross-user emulator/API tests; browser project states |
| Checkout and milestones | `/api/orders/:id/pay/:stage`, `/verify-payment`; `orders`, `payment_orders` | Atomic reservations, server amounts, signed confirmation, capture verification | Unit/API payment suite and real Firestore concurrent reservation test; external test-mode acceptance still requires credentials |
| Captures, refunds, reconciliation | `/api/payments/webhook`, admin reconcile | Original-byte HMAC, payload validation, duplicate/replay handling, no cancelled-order resurrection | Signed capture/refund API tests; reconciliation and failure tests |
| Admin overview and settings | `/api/admin/overview`, PUT settings; `business_settings` | Server admin authorization; payment terms/address gate | API role/configuration checks; admin browser journeys |
| Content, imports and packages | Admin content/settings/import APIs; `content`, legacy `blog_posts`, `content_slugs` | Imports remain drafts; slug reservation and content write are atomic; legacy data preserved | Import and publication API tests; concurrent Firestore slug/rename/delete test |
| Inbox | Admin inquiries API; `inquiries` | Admin only; new/contacted/closed transitions | API validation; visible paging controls |
| Community and moderation | Messages/reports APIs; `messages`, `reports`, `reply_jobs` | Parent visibility gates AI replies, even after inference starts; disabled community respected | Moderation/public-reply regression tests and lease recovery tests |
| Admin generation | `/api/admin/generation/*`; topics, feeds, candidates, jobs | Admin only; manual polling; three candidates per request; private generated drafts | Job, retry, attribution and source validation tests; desktop/mobile draft review and preview |
| Generation worker | `/internal/generation/:id`; `generation_jobs`, `content` | Verified Google OIDC audience/caller, fenced leases, atomic draft/job commit, three automatic attempts | Worker identity tests and real Firestore concurrent generation tests |
| Feed network access | Configured HTTPS RSS/Atom only | DNS/socket pinning, private/reserved address denial, redirect revalidation, bounded XML, no linked-page scraping | DNS rebinding/metadata/redirect tests; RSS/Atom parsing and count limits |
| Policies, redirects, missing pages | `/privacy`, `/terms`, `/refunds`; retained route redirects | Current business policy; no invented approval or price | Public route browser matrix |

Operational list APIs support the `X-List-Pagination: cursor` header and return `{ items, nextCursor }`. Existing array responses remain available for older clients. Admin overview returns first pages, counts and continuation cursors when the header is present. Generation collections always return the page envelope. Discussion pages filter visibility before calculating cursors and load older messages explicitly.

## Defects reproduced and repaired

- Hosted `/api/*` returned frontend HTML because the active Hosting release had only the SPA fallback and the expected Cloud Run service was absent. Backend and Hosting must be deployed in order.
- Global API rate limits returned HTML; they now return JSON. Malformed and oversized JSON bodies receive safe JSON errors without echoing submitted content.
- Service checks constructed Firestore RPCs before resolving credentials; missing credentials could crash outside normal error handling. Checks now preflight credentials and return structured failure.
- Firestore deployment files existed but were absent from `firebase.json`; configuration now links them explicitly.
- Firebase-served HTML lacked the API server's security headers; Hosting now supplies a compatible policy and headers.
- Non-content database lists silently stopped at 500 records. Store enumeration no longer truncates; operational UI lists have continuation controls.
- Slug checks relied on querying for absent records. New content uses a deterministic reservation document, with ownership-safe release on rename/delete.
- Public AI responses could appear after moderation. Parent/post visibility is rechecked after inference and on every read.
- The service selector could retain a package belonging to the previous service. Changing service now resets package selection; invalid initial service parameters fall back to Websites.
- Query requests did not consume cancellation signals. Identity-related cache removal can now abort requests.
- Runtime validation schemas unnecessarily entered the client bundle. Public catalog data is separated from server validation, and React DOM is placed in its own bundle.
- Dependency advisories were repaired with a patched XML parser and compatible transitive overrides; production audit is required again on dependency updates.
- Article generation originally accepted the first nonempty provider response before checking its JSON/field/markup validity, so unusable content consumed whole job attempts. Article-specific validation and truncated-output detection now allow the other approved model within the same attempt; bounded background timeouts and safe stage diagnostics support recovery.
- The original production image carried vulnerable OS utilities and bundled npm packages even though the application's dependency audit passed. A pinned, non-root minimal runtime removes those unused components, preserves dependency inventory, passes startup/TLS checks and has zero high/critical scanner findings. CI now checks the actual container; lower-severity findings remain recorded separately.

## Additional deployed evidence

The owner-selected administrator claim was verified through real API and browser sessions. Three topic jobs created private drafts that were reviewed and published; all three public detail routes and search passed mobile/desktop checks. Manual W3C feed polling imported 20 candidates and generated an attributed private draft on the repaired backend. A real duplicate worker delivery preserved the reviewed publication. Google provider configuration and popup opening pass; completed Google account sign-in remains an owner acceptance step. See [verification](verification.md) for release identifiers and remaining payment dependencies.

## Evidence limits

Mocked browser tests prove UI behavior, not external capture/refund or Google popup integration. Emulator tests prove identity and transaction behavior against Firebase emulators. Live Razorpay acceptance requires test-mode API keys, its separate webhook secret and configured business policies. Visual comparison has no committed screenshot baseline; automated accessibility and responsive checks do not establish complete accessibility conformance.
