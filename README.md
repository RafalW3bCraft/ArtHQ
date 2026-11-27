# ArtHQ

ArtHQ is a digital services studio and a subsidiary of
[rafalwebcraft.online](https://rafalwebcraft.online). This repository contains
its React/Vite frontend and Express API, with Firebase Authentication and
Firestore.
GitHub repository: https://github.com/RafalW3bCraft/ArtHQ (private).
The current application uses `content` for articles, reports and projects. It does
not use PostgreSQL or the repository polling jobs removed by the studio redesign.

## Local setup

Use Node 22 (`nvm use`) and the pinned pnpm version:

```sh
corepack enable
pnpm install --frozen-lockfile
cp env.example .env
```

Fill in the Firebase web configuration from the `arthq-tech` project. The
server and browser project IDs must match. For local server access, use **one**
credential method:

* `GOOGLE_APPLICATION_CREDENTIALS=./service-account.json` for a downloaded key file.
* `FIREBASE_SERVICE_ACCOUNT_KEY` for JSON or base64 JSON, never a file path.
* Application Default Credentials from `gcloud auth application-default login`.

Keep credentials out of Git and Docker images. Cloud Run should use its attached
service identity instead of a downloaded private key. See the
[Firebase Admin setup guide](https://firebase.google.com/docs/admin/setup).

```sh
pnpm verify:services
pnpm dev
```

The site runs at http://localhost:5000. Firebase console access and GitHub access
are separate from the application's server credentials. Connecting an assistant
plugin does not supply credentials to the deployed application.

## Blog workflow

Sign in with a Firebase user that has the `admin` custom claim. An authorized
operator can grant this with `pnpm admin:set FIREBASE_USER_UID`.

In **Admin → Content**:

1. Write an article with **New content**, or use **Import existing articles as drafts**
   to recover records from the old Firestore `blog_posts` collection.
2. The importer preserves original records, prevents duplicate page addresses,
   and reports imported, already imported and skipped records. Correct invalid
   fields or conflicting addresses before retrying. Each page contains up to 100
   records; select **Continue article import** until the final page is processed.
3. Review the body, source links, title and page address. Set **Publish on website**
   and save to make the article appear at `/blog` and `/blog/:slug`.

The importer cannot recover deleted records or a separate SQL database. Automatic GitHub-to-blog generation remains removed. Admin → Generation now supports topics and manually polled RSS/Atom feeds. Generated articles are always drafts and use the existing Content review/publish workflow. Configure the durable task queue before submitting generation jobs; no automatic news scheduler runs.

See [the flow inventory](docs/flow-inventory.md) for behavior and repair evidence and [operations and recovery](docs/operations.md) for generation, IAM, testing, deployment and rollback. Featherless is used by Geraki and generation, with models pinned in `shared/catalog.ts`.

## Verification

```sh
pnpm build
pnpm check
pnpm test:run
pnpm test:emulators
pnpm exec playwright install chromium
pnpm test:e2e
pnpm audit --audit-level=high
pnpm verify:services --require-ai
SITE_URL=https://arthq-tech.web.app pnpm verify:services --site-only
```

The base service check verifies Firestore, Authentication, and required web
configuration. `--probe-ai` / `--require-ai` make real model requests and fail if
neither model replies. `--require-payments` additionally requires all three
Razorpay settings; it does not verify payment capture. `SITE_URL` checks that the
deployed API returns successful JSON, detecting frontend HTML served at API URLs.
Failures exit nonzero. Unit/API tests mock external services; browser tests mock
identity and application APIs. No standalone lint task is configured.

## Deployment

The configured Firebase project is `arthq-tech` (`.firebaserc`). Firebase
Hosting serves `dist/public` at https://arthq-tech.web.app. The `/api/**`
rewrite in `firebase.json` forwards requests to Cloud Run service
`rafalwebcraft-api` in `asia-south1`; keep that service deployed in the same
Firebase project. Its resource name is retained for compatibility with the
existing server setup; the public-facing product name is ArtHQ.

Authenticate with Firebase CLI (`firebase login`) and Google Cloud
(`gcloud auth login`) before deploying.

Before deploying, the operator needs permission to inspect/deploy Cloud Run,
act as its runtime service identity, build/push its container, and deploy
Hosting. Confirm billing and required Google Cloud services are enabled. The
runtime identity needs Firestore access and Firebase Auth permissions, including
token revocation checks. Set `FIREBASE_PROJECT_ID=arthq-tech` and inject the AI
key from Secret Manager. For payments, also configure the three Razorpay secrets
and the webhook described in `env.example`.

Deploy the root Dockerfile to the configured Cloud Run service, listening on
`PORT`, and verify `/health`, `/api/health`, and `/readiness`. Firebase Hosting's
Cloud Run rewrite requires the service to be publicly invokable; application API
authorization still applies. `firebase.json` configures Hosting to serve `dist/public`,
rewrite `/api/**` to Cloud Run service `rafalwebcraft-api` (`asia-south1`), and fall
back to `index.html` for client-side routes.

**Step 1 — Deploy the Express backend to Cloud Run** (required before Hosting deploy will succeed):

```sh
gcloud auth login
gcloud config set project arthq-tech
gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com
gcloud builds submit --tag asia-south1-docker.pkg.dev/arthq-tech/arthq/rafalwebcraft-api
gcloud run deploy rafalwebcraft-api \
  --image asia-south1-docker.pkg.dev/arthq-tech/arthq/rafalwebcraft-api \
  --region asia-south1 --platform managed --allow-unauthenticated
```

Set required environment variables on the Cloud Run service:
`FIREBASE_PROJECT_ID=arthq-tech`, `FEATHERLESS_API_KEY`, `RAZORPAY_KEY_ID`,
`RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `NODE_ENV=production`,
`PORT=8080`. Inject the AI key and Razorpay secrets from Secret Manager.
The runtime identity needs Firestore access and Firebase Auth permissions
(including token revocation checks).

Verify the service responds: `https://rafalwebcraft-api-<hash>.asia-south1.run.app/api/health` returns JSON.

**Step 2 — Build and deploy Hosting + Firestore:**

```sh
pnpm build
firebase deploy --project arthq-tech --only hosting,firestore:rules,firestore:indexes
SITE_URL=https://arthq-tech.web.app pnpm verify:services --require-ai
```

**Step 3 — Hosting-only deploys** (frontend changes, after Cloud Run is deployed):

```sh
firebase deploy --project arthq-tech --only hosting
```

Deploying Hosting alone does not deploy the Express server. Verify that API
routes return JSON (not the frontend HTML) after deployment. Publishing content,
approving business policies and enabling payments remain separate admin actions.
