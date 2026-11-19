# ArtHQ launch runbook

## Current release

- Firebase project: `arthq-tech` (display name **ArtHQ**)
- Live Hosting site: <https://arthq-tech.web.app/>
- Custom canonical domain: `arthq.tech`
- `www` behavior: redirect to `arthq.tech`
- Firestore: Standard, Belgium (`europe-west1`), delete protection enabled
- Authentication: Email/Password enabled
- DNS: not resolving at release verification; records still need to be added in Get.tech
- Firebase custom-domain status: not started
- TLS: not issued; accept the custom-domain release only after Firebase verifies DNS and provisions HTTPS

## Get.tech DNS setup

Firebase's current required records for this Hosting site are:

| Record | Host in Get.tech | Value |
| --- | --- | --- |
| A | blank / apex | `199.36.158.100` |
| TXT | blank / apex | `hosting-site=arthq-tech` |
| CNAME | `www` | `arthq-tech.web.app` |

Firebase may request a current ACME challenge TXT record to provision the TLS certificate. Read the current challenge value in the Firebase Hosting custom-domain setup before adding it; challenge values can change.

The existing zone contains Zoho email-related TXT records. Keep them in place while adding the Firebase records. Do not replace the apex TXT set with only the Firebase ownership record. In Get.tech's control panel, open the domain's **DNS Service** and **Manage DNS**; use a blank host for the apex and `www` for the CNAME host.

After saving DNS records, allow propagation and TLS provisioning. Verify `https://arthq.tech`, `https://www.arthq.tech` (301 to the apex), `/api/health`, and direct refreshes at `/auth`, `/dashboard`, and `/admin`. Firebase's custom-domain wizard provides the authoritative current record set and status.

## Release verification

The ArtHQ Codebase Audit and Production Polish release is deployed to Firebase Hosting at the default URL. TypeScript, production build, production dependency audit, Firestore emulator security tests, and browser workflows passed. Production routes and the ArtHQ health JSON returned successfully. A final Kane read-only review of the Firebase preview passed; a prior broad Kane run recorded a contradictory generated carousel checkpoint despite successful browser observations. See [QA_REPORT.md](QA_REPORT.md). The custom-domain DNS and TLS gate remains open. Repeat the browser smoke check and authenticated client-to-admin flow after the custom domain becomes active.

Useful commands:

```sh
npm run preview:firebase
npm run deploy:firebase
npm run test:rules
npm run test:browser
```
