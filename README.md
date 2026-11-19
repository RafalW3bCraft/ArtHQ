# ArtHQ

ArtHQ is a subsidiary of RafalW3bCraft. Its English-language Hall of Achievement presents six selected website and digital projects from RafalW3bCraft, 4AM SOCIETY, Ribison Chemicals, Creative Laser Art, FinServiceBot, and Smart Growly Bot. Clients can submit project briefs, track status, and request support. Staff can process projects, tickets, and contact enquiries.

Support: [support@arthq.tech](mailto:support@arthq.tech) · [info@rafalwebcraft.online](mailto:info@rafalwebcraft.online). Project documentation index: [docs/](docs/README.md); business and service structure: [PRODUCT_AND_SERVICES.md](docs/PRODUCT_AND_SERVICES.md); application architecture: [ARCHITECTURE.md](docs/ARCHITECTURE.md); visual rules: [DESIGN.md](docs/DESIGN.md); maintenance audit: [MAINTENANCE_AUDIT.md](docs/MAINTENANCE_AUDIT.md); search audit: [SEO_AUDIT.md](docs/SEO_AUDIT.md); release checks: [QA_REPORT.md](docs/QA_REPORT.md).

## Run locally

Use Node 24.12 or newer. The repository includes a Node version file for compatible version managers.

```sh
npm ci
npm run dev
```

The public portfolio works without backend settings. It presents six projects in an auto-advancing horizontal carousel, ArtHQ’s website/app services, and a project workflow. The carousel pauses on hover, keyboard focus, and manual interaction and stops autoplay for reduced motion. For a connected portal, copy `.env.example` to `.env.local` and fill in the three Firebase **web app** settings. Vite embeds these public settings at build time. Keep account credentials and service account keys outside the repository.

```sh
npm run build
npm start
```

The static output is in `dist/public`. The intended custom address is `https://arthq.tech/`; until Get.tech DNS verification completes, the live Firebase address is `https://arthq-tech.web.app/`. The supported application routes are `/`, `/auth`, `/dashboard`, and `/admin`. The static health endpoint at `/api/health` returns the service name and deployment status. Portal access and form submission depend on Firebase.

## Configure a fresh Firebase backend

1. Sign in with `firebase login`. The fresh Firebase project uses display name **ArtHQ** and project ID `arthq-tech` (`firebase projects:create arthq-tech --display-name ArtHQ`). The shorter ID `arthq` is invalid because Google Cloud requires project IDs to be at least six characters long.
2. Confirm the default Hosting site exists with `firebase hosting:sites:list --project arthq-tech`; if it does not, create it with `firebase hosting:sites:create arthq-tech --project arthq-tech`. Register a web application named **ArtHQ** after the Hosting site exists and use its API key, project ID, and app ID for the three variables in `.env.example`.
3. Email/Password sign-in is configured as code in `firebase.json` and deployed by `npm run deploy:firebase`. Add `arthq.tech` to Authentication's authorized domains after connecting the custom domain.
4. Create the default **Cloud Firestore Standard** database in **Belgium** (`europe-west1`), in production mode. This database location cannot be changed after creation.
5. Deploy the rules and indexes and wait for the indexes to finish building.

```sh
firebase deploy --only auth,firestore:rules,firestore:indexes --project arthq-tech
```

6. Register the intended admin account and have a trusted Firebase project operator assign its `role: admin` in Firestore. See [admin setup](docs/ADMIN_SETUP.md) and [Firestore access](docs/FIRESTORE_SECURITY_RULES.md).
7. Keep the fresh backend separate from earlier projects. The former tracked environment file contained an admin password and a session secret. Rotate any values still in use through their owning services. Removing a file from the current revision leaves previous public commits accessible.

## Preview and deploy with Firebase Hosting

Copy `.env.example` to `.env.local` and enter the Firebase web app settings. These public client settings are embedded in the build; never put service account credentials in a Vite variable. The `.firebaserc` default and deploy scripts target project `arthq-tech`.

Create a temporary Firebase Hosting preview and verify it before production deployment:

```sh
npm run preview:firebase
```

Test sign-up, brief submission, client status visibility, support ticket submission, admin updates, and manual email reply links with dedicated release accounts. Confirm all six portfolio destinations and their images load. Deploy Hosting and Firestore rules/indexes together only after the preview and workflow are verified:

```sh
npm run deploy:firebase
```

The Firebase Hosting default address is live. The custom domain has not yet been verified or activated in Hosting, and DNS did not resolve during the release check. Follow the [launch runbook](docs/LAUNCH_RUNBOOK.md) to add the current Firebase-provided records at Get.tech; preserve existing email-related DNS records. After Firebase reports the domain connected and TLS is active, check HTTPS at `https://arthq.tech`, the `www` redirect, `/api/health`, direct portal-route refreshes, all portfolio links, and the signed-in client-to-admin workflow. [Firebase Hosting custom domains](https://firebase.google.com/docs/hosting/custom-domain) · [Get.tech DNS management](https://cp.get.tech/kb/node/636)

## Verify changes

Run `npm run check`, `npm run build`, and `npm audit --omit=dev`. The production dependency override selects a patched gRPC transport for Firebase's Node dependency. Browser application data access uses the Firebase web SDK.

Start Firebase CLI 15 emulators with Java 21 or newer in a separate terminal.

```sh
firebase emulators:start --only auth,firestore --project demo-arthq
```

With the emulators running, run the rules tests first. They clear only the local demo database. The browser test builds into a temporary directory, uses isolated sessions for two clients and an admin, and creates fresh local test accounts.

```sh
npm run test:rules
CHROMIUM_BIN=/path/to/chromium npm run test:browser
```

For manual portal testing with the same emulators, pass local-only web settings when starting Vite.

```sh
VITE_USE_EMULATORS=true VITE_FIREBASE_PROJECT_ID=demo-arthq \
VITE_FIREBASE_API_KEY=demo-arthq-key VITE_FIREBASE_APP_ID=1:123:web:abc npm run dev
```

Open the local URL on `localhost` or `127.0.0.1`. Emulator connections are restricted to loopback and a demo project identifier.

## Project tooling and media

ECC 2.2.3 is installed in `.agents` using the project-local full profile. Its installation receipt records the supported modules. The reviewed source commit is `90606c8315ee09cafc303515c5f33024db6b9882`. The tooling stays outside the static publish directory. [ECC source](https://github.com/affaan-m/ECC/tree/90606c8315ee09cafc303515c5f33024db6b9882)

Portfolio screenshots and the social card live in `client/public/media`. Fonts and their licenses are included in `client/public/fonts`. Client testimonials are only published when the client attribution, exact quote, and permission to publish are confirmed.
