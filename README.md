# RafalWebCraft

React/Vite frontend and Express API, with Firebase Authentication and Firestore.
GitHub repository: https://github.com/RafalW3bCraft/RafalWebCraft (private).
The current application uses `content` for articles, reports and projects. It does
not use PostgreSQL or the repository polling jobs removed by the studio redesign.

## Local setup

Use Node 22 (`nvm use`) and the pinned pnpm version:

```sh
corepack enable
pnpm install --frozen-lockfile
cp env.example .env
```

Fill in the Firebase web configuration from the `rafalwebcr4ft` project. The
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

The importer cannot recover deleted records or a separate SQL database. Automatic
GitHub-to-blog generation remains removed, as requested. Featherless is used by
Geraki, with models pinned in `shared/business.ts`.

## Verification

```sh
pnpm build
pnpm check
pnpm test:run
pnpm exec playwright install chromium
pnpm test:e2e
pnpm audit --audit-level=high
pnpm verify:services --require-ai
SITE_URL=https://rafalw3bcraft.web.app pnpm verify:services
```

The base service check verifies Firestore, Authentication, and required web
configuration. `--probe-ai` / `--require-ai` make real model requests and fail if
neither model replies. `--require-payments` additionally requires all three
Razorpay settings; it does not verify payment capture. `SITE_URL` checks that the
deployed API returns successful JSON, detecting frontend HTML served at API URLs.
Failures exit nonzero. Unit/API tests mock external services; browser tests mock
identity and application APIs. No standalone lint task is configured.

## Deployment

The intended topology is Firebase Hosting site `rafalw3bcraft` in project
`rafalwebcr4ft`, forwarding `/api/**` to Cloud Run service `rafalwebcraft-api` in
`asia-south1`. The similarly named `rafalwebcr4ft` Hosting site is a separate site;
do not delete or deploy to it just to resolve the naming difference.

Before deploying, the operator needs permission to inspect/deploy Cloud Run,
act as its runtime service identity, build/push its container, and deploy Hosting.
Confirm billing and required Google Cloud services are enabled. The runtime
identity needs Firestore access and Firebase Auth permissions, including token
revocation checks. Supply `FIREBASE_PROJECT_ID=rafalwebcr4ft` and inject the AI key
from Secret Manager. For payments, also configure the three Razorpay secrets and
the webhook described in `env.example`.

Build/deploy the root Dockerfile to the stated Cloud Run service, listening on
`PORT`, and verify `/health` and `/readiness`. Firebase Hosting's Cloud Run rewrite
requires the service to be publicly invokable; application API authorization
still applies. Build the frontend with its public `VITE_FIREBASE_*` settings, then
deploy Hosting and Firestore rules/indexes:

```sh
pnpm build
firebase deploy --project rafalwebcr4ft --only hosting,firestore:rules,firestore:indexes
SITE_URL=https://rafalw3bcraft.web.app pnpm verify:services --require-ai
```

Deploying Hosting alone does not deploy the Express server. Do not treat HTTP 200
as API health if the response is HTML. Publishing content, approving business
policies and enabling payments remain separate admin actions.
