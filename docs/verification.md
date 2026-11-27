# ArtHQ verification and activation status

Verified on 27 November 2026. The core website and Geraki API are deployed and operational. Full business activation remains pending the administrator assignment, external payment acceptance and optional Google provider configuration described below.

## Local and integration results

| Check | Result |
| --- | --- |
| Node / package manager | Node 22.21.1; pnpm 9.15.9 |
| TypeScript | Passed |
| Production build | Passed; no large-chunk warning after catalog/chunk changes |
| Unit and API tests | 84 passed across six files |
| Auth/Firestore emulator tests | Four passed, including transaction races and direct-client database denial |
| Browser tests | 38 passed across desktop/mobile, including topic generation → private draft → preview; four relevant workspace/public-page checks passed again after restoring the original order/discussion polling intervals |
| Dependency audit | Zero advisories across production and development dependencies |
| Source review | Compared with the pre-repair archive; no Git metadata was present in this checkout |

Tests of Razorpay calls use mocked provider responses. Browser identity and application APIs are mocked. Neither result establishes real payment capture or real account popup acceptance. Coverage was not instrumented; there is no configured standalone lint task or committed visual screenshot baseline.

## Deployed acceptance

| Check | Result |
| --- | --- |
| Hosting | https://arthq-tech.web.app; release `9b91d1b2bced0378` |
| Backend | Cloud Run `rafalwebcraft-api`, `asia-south1`; revision `rafalwebcraft-api-00002-cwc` |
| Build | Cloud Build `108ab5d3-96eb-4059-9fe9-541014da3b0f`; image `asia-south1-docker.pkg.dev/arthq-tech/arthq/api:9843dd3c57e2f7e0` |
| API forwarding | `/api/health`, `/api/readiness`, `/api/site`, `/api/content` return successful JSON through Hosting |
| Hosting headers | CSP, nosniff and frame denial verified |
| Live pages | 45 read-only page/viewport checks across widths 375, 768, 1440; no missing headings, horizontal overflow, page errors or API failures |
| Live accessibility | Home, Geraki, login and contact at mobile width: no automated axe violations; representative mobile/desktop screenshots inspected. The public-page sweep ran on release `4835d3b38ae7453f`; final release `9b91d1b2bced0378` only restores workspace polling intervals and was rechecked through the targeted browser suite and hosted API probes |
| Private Geraki | Hosted request returned HTTP 200 and a real MiniMax M3 reply |
| Approved models | Both pinned models returned real greetings in service probing |
| Article generation adapter | Real topic generation returned schema-valid JSON through Kimi K3 after primary-model timeout; no draft was persisted by this probe |
| Worker identity | Real Cloud Tasks OIDC delivery passed identity verification and reached the deliberate missing-job check; probe task deleted; no application data written |
| Queue | `arthq-articles`, `asia-south1`; concurrency one, at most three attempts |
| Authorization | Anonymous admin overview returns JSON HTTP 401 |
| Firestore rules/indexes | Deployed; existing deny-direct-client rules confirmed unchanged |

The backend runtime uses its attached service identity and the AI key is stored in Secret Manager. Dedicated runtime, task-caller and build identities have the permissions needed for these flows. The application image was built before the final development-tool-only Vite/OpenTelemetry updates; its runtime production dependencies were already patched and development packages are pruned from the image. The published frontend was built with patched Vite 6.4.5.

## Remaining activation and evidence dependencies

- **Administrator:** Firebase currently contains one account and no administrator claims. Assign the admin claim only to the UID/email explicitly selected by the owner, preserving existing claims. Then sign out/in to refresh its token. The account-selection question is pending; no user was promoted automatically.
- **Payments:** Razorpay credentials/webhook and approved business settings are absent. Checkout remains disabled. Real test-mode booking, milestones, capture, webhook redelivery, reconciliation and refunds have not been executed.
- **Google login:** Email/password is enabled. No Google provider configuration was found. Its button is disabled by default; configure the project-owned OAuth client/provider before enabling the build flag and testing a real popup login.
- **Content:** Production `content`, `blog_posts`, `business_settings` and `orders` collections contained zero documents at inspection. A private backup of content/settings was taken before deployment. No old articles were available to import in this project. New generated articles remain drafts until reviewed and published; recovering articles from another database requires that original data.
- **Local server credentials:** Public Firebase web values are configured, but local ADC/service-account credentials are absent. The default service verification reports this as structured failure. Hosted acceptance can be run independently using `SITE_URL=https://arthq-tech.web.app pnpm verify:services --site-only`.
- **Authenticated deployed workflows:** Publishing, community posting and a successful persisted generation job were verified locally/emulated, not exercised against production data with a seeded administrator account. The real queue identity/dispatch boundary and inference provider were verified separately.

Use [operations and recovery](operations.md) for setup, task retries, deployment and rollback, and [the flow inventory](flow-inventory.md) for route/action coverage. Do not describe payment or authenticated target acceptance as passed until the missing checks are executed.
