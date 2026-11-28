# ArtHQ operations and recovery

## Local development and verification

Use Node 22.23.5 (`nvm use`) and pnpm 9.15.9. Install with `pnpm install --frozen-lockfile`. The public `VITE_FIREBASE_*` configuration identifies the web app; it cannot authorize the server. Supply ADC through `gcloud auth application-default login`, or one documented service-account credential method. Keep credentials out of the repository and images.

Run `pnpm check`, `pnpm test:run`, `pnpm build`, `pnpm exec playwright install chromium`, and `pnpm test:e2e`. Run `pnpm test:emulators` with Java 21 or newer for real Firebase Auth/Firestore transaction tests. Tests use a `demo-` project and refuse to run against production. CI runs these checks on Node 22. No standalone lint task is configured.

`pnpm verify:services` is read-only and checks storage, Auth and web configuration. Add `--require-ai` to make real requests to both pinned models; at least one usable reply is required. Add `--require-payments` to require all Razorpay settings, but use the checkout acceptance below to prove capture. Use `SITE_URL=https://arthq-tech.web.app pnpm verify:services --site-only` to verify hosted API JSON independently of local credentials. Configuration presence and successful inference are reported separately.

Add `--probe-google` to check whether Firebase can construct a Google authorization request. Use `--require-google` to fail verification if its provider/web client is missing. These checks work with `--site-only`, use the public web configuration, and never print the authorization URI or authentication session. A successful configuration check still requires a real popup sign-in to establish end-to-end acceptance.

## Article generation

In Admin → Generation, save a topic and select Generate draft. Reference material is optional; unsupported current-event claims must be removed during review. Add approved public HTTPS RSS/Atom feeds and select Poll now to import candidates. Polling is manual and reads feed content only. Select at most three candidates for a generation request. Review completed drafts, preview Markdown, edit sources/claims, then publish using the existing Content editor. Generation never enables publication.

Sources, jobs and provenance live in `generation_topics`, `generation_feeds`, `news_candidates` and `generation_jobs`; resulting drafts use the existing `content` collection. A source maps to one job and one deterministic draft. Repeat deliveries cannot overwrite edited content. Create a new topic for a substantially different article; edit an existing draft through Content.

## Cloud Tasks

Configure server-only `TASKS_PROJECT_ID`, `TASKS_LOCATION`, `TASKS_QUEUE`, `TASKS_WORKER_URL` (the canonical Cloud Run origin, no trailing slash) and `TASKS_SERVICE_ACCOUNT`. Enable Cloud Tasks and configure the queue using `pnpm tasks:configure` with authorized ADC. It enforces concurrency one and three automatic attempts.

The runtime identity needs Cloud Tasks Enqueuer, Firestore access, Firebase Auth read access and Secret Manager access to its own AI secret. Grant it Service Account User on the dedicated task caller. The Cloud Tasks service agent needs token-creation access on that caller. The worker validates Google's signature, issuer, audience, verified email and exact caller email before doing work. Do not treat Cloud Tasks headers as authentication. These application checks are necessary because the Hosting-compatible API service is publicly invokable.

The enqueue API persists a job before creating its task. Enqueue errors remain visible as failed jobs. Provider/output failures receive up to three automatic attempts; after exhaustion the job stays failed. An admin can retry failed or interrupted jobs. A running lease expires after two minutes; queued work can be retried after three minutes. Lease tokens fence commits and draft creation/job completion occur in the same Firestore transaction. Monitor failed jobs and Cloud Tasks delivery errors; never fix failures by manually setting content to published.

Article responses are validated before accepting a provider result, so truncated output, invalid JSON/fields and unsupported markup can use the other pinned model within the same attempt. Each article provider has a 35-second deadline; the combined inference budget fits inside the 120-second task deadline and lease. Interactive Geraki retains its 22-second per-provider deadline. Logs record safe provider categories and the failed job stage without recording source material or generated output.

## Deploy and verify

Deploy the backend image to `rafalwebcraft-api` in `asia-south1`, project `arthq-tech`, before deploying Hosting. Use the attached `arthq-runtime` service identity and Secret Manager for Featherless. The root Dockerfile runs as a non-root user and excludes local credentials. Set maximum instances deliberately; the initial limit is three. `TRUST_PROXY_HOPS` defaults to one on Cloud Run and zero locally; review the actual ingress topology before changing it. Do not set unrestricted trust.

Build/push an immutable image and retain its digest, source hash, Cloud Build ID, Cloud Run revision, Hosting version and task queue configuration. Set Firebase web build arguments when building the container. The public website's Firebase values are compiled into Hosting assets at build time. Server credentials are supplied only at runtime.

The runtime uses pinned Google Distroless digests with Node 22.23.5, UID 65532, no shell and no package manager. Node's binary embeds OpenSSL and its loaded-library report confirms it does not use Debian's separate libssl. The final image uses [Distroless base-nossl](https://github.com/GoogleContainerTools/distroless/blob/main/base/README.md) with the Node binary and its actual C++ libraries, preserving library package inventory and copyright files. This avoids carrying unused vulnerable tools/libraries. Node's embedded crypto still follows Node security releases; the app exposes HTTP over TCP, not OpenSSL QUIC. Monitor upstream Node/OpenSSL advisories when updating the pinned runtime.

Run `docker run --rm IMAGE scripts/smoke-image.mjs` before deploying a new image. It checks non-root execution, application startup, anonymous admin denial, frontend serving, and real outbound TLS/certificate validation using a demo project without writing data. CI builds the image and runs this check, then uses checksum-pinned Trivy 0.76.2 to reject high/critical findings. Scan all severities for the release record; do not hide findings with blanket ignore files. Update `.nvmrc`, build/runtime versions and digest pins together, then repeat the image scan and live API/AI/task checks.

Deploy Hosting, rules and indexes with `firebase deploy --project arthq-tech --only hosting,firestore:rules,firestore:indexes`. Check `/api/health`, `/api/readiness`, `/api/site` and `/api/content` through the Hosting domain for successful JSON. Inspect CSP headers and public routes. Root `/health` and `/readiness` are Cloud Run health surfaces; use their `/api/` equivalents through Hosting. Configure uptime checks for `/api/health` and `/api/readiness`, and alerts for non-2xx task deliveries, failed generation jobs and Razorpay webhook delivery errors.

Before data imports or a release, retain a private backup of content and settings. Legacy import is additive and never deletes `blog_posts`. Generated fields are additive; no destructive migration is required. The source repair archive is kept outside the served directory. Never expose backup downloads from the public app.

## Payment acceptance and activation

Keep checkout unavailable until all three Razorpay variables, business address, approved terms and refund policy are configured. Use test keys and the matching test webhook. Test booking, approval, progress and delivery; verify INR amounts, the booking credit, signed capture and refund events, replay, interrupted creation and reconciliation. Confirm captured status through the provider; a UI success callback is not proof of payment. Test partial and full refunds and verify cancelled work never reopens. Do not charge a live customer as a diagnostic.

Do not silently switch between test and live keys. Live activation requires explicitly configured live credentials and webhook after test acceptance. Existing orders retain their policy snapshot and provider references. If a payment is uncertain, reconcile its original provider order rather than creating another charge.

## Rollback

Keep the previous Hosting release and Cloud Run revision. First route traffic back to the last healthy backend revision using `gcloud run services update-traffic rafalwebcraft-api --region asia-south1 --to-revisions=REVISION=100`. Roll back Hosting through Firebase Hosting release history, keeping `/api/**` forwarding intact. For the first backend release, if no prior healthy revision exists, keep checkout/generation disabled and repair the API; a frontend-only release cannot replace backend functionality.

The current hardened backend is `rafalwebcraft-api-00004-4x4`. Its predecessor `rafalwebcraft-api-00003-cjx` is functional but carries the container findings documented in [the image audit](container-audit.md); it is not the security-approved runtime. Prefer rebuilding an earlier application version on the hardened Dockerfile when possible, and treat a traffic rollback to the older base as temporary incident recovery.

Pause the article queue with `gcloud tasks queues pause arthq-articles --location asia-south1` during an incident. Resume only after checking job leases and idempotency. Do not delete published content or rewrite payment records to roll back code. Restore data only from a verified backup under an explicit recovery decision. Disable compromised secret versions and deploy a new revision with the replacement secret.

## Google sign-in availability

Email/password and Google are enabled in the current Firebase project. Google's project-owned web client was confirmed on 27 November 2026 and `VITE_FIREBASE_GOOGLE_ENABLED=true` was deployed to Hosting. Fresh installations default to false until provider setup is complete; this flag controls UI availability, not authorization. Confirm authorized domains and popup flow before enabling it on another deployment. Never reuse the Firebase CLI's OAuth client for application sign-in. Email registration, verification and password reset remain available independently.

For this deployment, use [Firebase Authentication providers](https://console.firebase.google.com/project/arthq-tech/authentication/providers) to enable Google and select the project's support email. The web OAuth client's authorized origins should cover `https://arthq-tech.web.app` and `https://arthq-tech.firebaseapp.com`; its redirect URI is `https://arthq-tech.firebaseapp.com/__/auth/handler`. Only add custom origins that the business controls and serves. Keep the client secret in provider configuration, never in a `VITE_*` variable. [Firebase's provider configuration documentation](https://firebase.google.com/docs/auth/configure-oauth-rest-api) explains the required client ID and secret.
