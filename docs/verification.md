# ArtHQ verification and activation status

Verified on 27 November 2026. The website, administrator access, Google provider configuration, Geraki API, reviewed article publication and manual feed-to-draft pipeline are deployed. Payment activation remains pending secure test credentials and approved business settings. A successful Google account sign-in still requires the account owner to complete the popup.

## Local and integration results

| Check | Result |
| --- | --- |
| Node / package manager | Node 22.23.5; pnpm 9.15.9 |
| TypeScript | Passed |
| Production build | Passed; no large-chunk warning |
| Unit and API tests | 88 passed across six files; four new cases reject truncated output, invalid JSON, invalid fields and unsafe markup before selecting the fallback article model |
| Auth/Firestore emulator tests | Four passed, including transaction races and direct-client database denial |
| Browser tests | All 38 passed across desktop/mobile, including generation → private draft → preview, publication changes, account states, contact recovery and retained routes |
| Dependency audit | Zero advisories across production and development dependencies |
| Production image scan | Zero critical/high findings; 21 medium, 12 low and two unknown package findings retained for tracking; no ignore/unfixed suppression |
| Runtime smoke | Non-root UID 65532, startup, JSON admin denial, frontend serving and outbound TLS/certificate validation passed in Cloud Build |
| Source review | Compared with the pre-repair archive and the now-available Git diff; no whitespace errors. Earlier audit stages preceded Git initialization |

Razorpay responses and browser identities/APIs in the local suites are mocked. Real Firebase Auth/Firestore concurrency is tested separately in the emulators. Coverage was not instrumented; there is no standalone lint task or committed screenshot baseline.

## Current deployed release

| Surface | Version |
| --- | --- |
| Hosting | https://arthq-tech.web.app; release `f85811e039b65f8b` |
| Backend | Cloud Run `rafalwebcraft-api`, `asia-south1`; revision `rafalwebcraft-api-00004-4x4` |
| Build | Cloud Build `658ef8de-d592-406c-b4ee-84de1d190380` |
| Image | `asia-south1-docker.pkg.dev/arthq-tech/arthq/api:298b23f039705b65` |
| Previous backend | `rafalwebcraft-api-00003-cjx` (functional fallback; superseded for container security) |
| Previous Hosting | `9b91d1b2bced0378` |

The public frontend is served by Firebase Hosting. The hardened backend image also includes the enabled Google frontend flag. Both build and runtime use Node 22.23.5. The deployed image passed its application/auth/frontend/TLS smoke check and a vulnerability gate before receiving traffic. See [the container vulnerability record](container-audit.md) for findings and scope.

## Deployed acceptance

| Check | Result |
| --- | --- |
| API forwarding | Hosted health, readiness, site and content return successful, schema-checked JSON |
| Administrator | Owner-selected UID `3WS0M7DrwTVs3TmkQYZet9d3d4l2` has `admin: true`, `role: admin`; existing unrelated claims preserved |
| Authenticated admin | Real short-lived Firebase session accepted by the API and live admin UI; Generation checked at widths 375 and 1440 with no axe violations, overflow or page errors |
| Google configuration | Enabled, project-owned OAuth web client and client secret present; Firebase constructs a valid Google authorization request; frontend flag enabled and deployed |
| Google popup | Both mobile/desktop buttons reached Google's email/phone sign-in form; no provider error, CSP error, page error, axe violation or overflow. No Google account credentials were entered; completed sign-in and callback remain an owner acceptance step |
| Published articles | Three generated private drafts reviewed, edited and published through the authenticated content API; [reviewed bodies and provenance](articles/README.md) retained |
| Public article pages | All three present in Insights, searchable and reachable at both widths; six detail checks passed with sources, no invalid links, API/page errors, axe violations or horizontal overflow |
| Generation | All three topic jobs completed; two used automatic retries and Kimi fallback. Reviewed publications contain 600–900 words approximately |
| Manual feed polling | W3C Blog imported 20 newest candidates; one selected candidate completed generation on the new backend in one attempt using MiniMax M3 |
| Feed draft privacy | Generated news draft is unpublished, retains source URL/date and returns public HTTP 404; left for administrator review |
| Duplicate delivery | Real Cloud Tasks OIDC redelivery of a completed job preserved the reviewed publication byte for byte, repeated successfully on the hardened deployment |
| Private Geraki | Hardened deployment returned HTTP 200 and a real MiniMax M3 reply without thinking output; both pinned models separately returned real responses |
| Queue | `arthq-articles`, `asia-south1`; concurrency one, at most three automatic attempts |
| Authorization | Anonymous admin requests denied; worker independently validates Google OIDC identity |
| Hosting headers | CSP, frame denial and nosniff verified; Firebase's reserved auth iframe/handler remain available without the application's frame denial |
| Firestore | Rules/indexes deployed; deny-direct-client rules and transactional storage retained |

The earlier public route sweep covered 45 read-only page/viewport checks at widths 375, 768 and 1440, with no missing headings, overflow, page errors or API failures. Earlier live axe checks covered home, Geraki, login and contact. The additional article, administrator and Google checks above exercised the populated deployment. Automated checks and representative screenshot inspection do not establish full accessibility conformance.

Runtime credentials use attached service identity and Secret Manager. Temporary operator signing access used for the explicitly authorized administrator/publication checks was removed after session creation; credentials were not saved in source or application configuration. Production content/settings backups were taken before deployment and publication.

## Remaining activation and evidence dependencies

- **Payments:** The owner is configuring Razorpay test keys/webhook and approved address, refund terms and packages. Checkout stays disabled until configuration and real test-mode booking, milestones, capture, webhook replay, reconciliation and refunds pass. Do not infer payment readiness from mocked tests or key presence. Live payments require separate explicit activation.
- **Google account completion:** Configuration and popup opening pass. The owner must complete Google sign-in and confirm return to the correct Firebase account; sign out/in to refresh the assigned administrator claim.
- **Other authenticated external flows:** Real email verification/reset delivery, public community replies and full customer payment journeys were not executed against production accounts. Their local/emulator evidence is recorded in the flow inventory; do not label these external checks complete.
- **Legacy content:** The production `content` and `blog_posts` collections were originally empty. No historical articles were recovered or deleted. Three new articles are published and a feed-generated draft is private.
- **Local server credentials:** Public Firebase web values are configured; local ADC/service-account credentials remain absent. Default verification reports structured failure. Hosted checks can run independently using `SITE_URL=https://arthq-tech.web.app pnpm verify:services --site-only --require-google`.
- **Lower-severity container findings:** Medium/low/unclassified package findings remain open in [the container record](container-audit.md), without fixed Debian versions in this scan. The high/critical gate passes; this is not a claim that every embedded component or vulnerability class is covered.

The current release supports the public website, AI assistance and reviewed publishing. All 88 unit/API tests, type checks and four emulator tests passed again under the patched Node version; the full desktop/mobile browser suite passed 38 tests. Full business production sign-off remains conditional on the external acceptance checks above. Use [operations and recovery](operations.md) for setup, task retries, deployment and rollback, and [the flow inventory](flow-inventory.md) for route/action coverage.
