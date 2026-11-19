# ArtHQ Studio Refresh QA

## Release scope

The refresh presents ArtHQ as a website and app studio and a subsidiary of RafalW3bCraft. It adapts suitable typography, color, layout, and motion patterns from the reviewed archive into the existing six-project portfolio and Firebase portal. The archive's 3D, coffee commerce, cart, checkout, quiz, and order features were excluded. No testimonials were added because client quote, attribution, and publication permission were not available for verification.

## Verification evidence

| Check | Result | Evidence |
| --- | --- | --- |
| TypeScript | Pass | `npm run check` |
| Production build | Pass | `npm run build`; output generated in `dist/public` |
| Production dependencies | Pass | `npm audit --omit=dev --audit-level=low`: 0 vulnerabilities |
| Firestore rules | Pass | `npm run test:rules`: 4 tests passed, including profile role protection, ownership, project/ticket lifecycle, and staff-only enquiries |
| Browser workflows | Pass | `npm run test:browser` against Auth and Firestore emulators: two clients and one admin account; sign-up, profile completion, brief, status, support, contact, manual email reply link, denied client admin access, sign-out, invalid credentials, successful re-login, and deep-route refresh flows passed |
| Authentication lifecycle | Pass | An Auth-only account completed its missing profile and signed out; the client signed out, saw the invalid-credential recovery message, signed back in, and refreshed the dashboard successfully |
| Public UI and responsive | Pass | Playwright checked 390×844, 768×1024, and 1440×900, with no page-level horizontal overflow |
| Carousel/accessibility | Pass | Touch/scroll layout, prior/next, keyboard arrows, timed autoplay resume after pressing Play, pause after manual navigation, reduced-motion behavior, mobile menu Escape/focus return, and button labels checked |
| Error and empty states | Pass | Offline enquiry error and a second client's empty projects/tickets were asserted |
| SEO and health | Pass | Canonical, title, Open Graph, JSON-LD parent relationship, sitemap, robots, and `/api/health` checked |
| Firebase preview | Pass | Final preview deployed at <https://arthq-tech--preview-rfsr1yoy.web.app/> as version `fe2e2e449b225e7b`; valid through 2026-11-26 |
| Kane preview review | Pass | Final read-only Kane CLI review at the Firebase preview inspected the homepage and `/auth` at 390px; project images loaded and no homepage console errors were reported. A prior broader Kane run recorded successful carousel counter advancement and route checks but ended with a contradictory generated pause-label checkpoint; Playwright emulator tests passed carousel timing and admin flows. |
| Project documentation links | Pass | Local Markdown links checked across `README.md` and `docs/*.md`; all 12 project documents resolve |
| Firebase production | Pass | Hosting version `d018bdc0c0579f3b` deployed to project `arthq-tech`; Auth, schema, rules, and indexes were unchanged |
| Production smoke | Pass | `/`, `/api/health`, `/auth`, `/dashboard`, `/admin`, `/sitemap.xml`, and `/robots.txt` returned HTTP 200; portal routes returned `X-Robots-Tag: noindex, nofollow`; health JSON identified ArtHQ |

Rendered screenshots for mobile, tablet, desktop, admin support, and admin enquiries, plus the ECC evidence record, are kept under the ignored local `.agents/evidence/studio-refresh/` folder. Color contrast ratios were checked against the design tokens: light body 14.37:1, muted text 5.54:1, links 6.8:1, button text 5.87:1, focus 5.87:1; dark body 15.45:1, muted text 10.13:1, links 11.84:1, button text 8.76:1, focus 11.19:1.

## Release status and limits

Firebase Hosting uses the project default address <https://arthq-tech.web.app/>. At verification, `arthq.tech` and `www.arthq.tech` did not resolve, and Firebase Hosting custom-domain status was `NOT_STARTED`; no custom-domain HTTPS or `www` redirect is claimed. Complete the DNS steps in [LAUNCH_RUNBOOK.md](LAUNCH_RUNBOOK.md), wait for Firebase to issue TLS, then repeat domain, route-refresh, and authenticated workflow checks.

Build output reports a 663.71 KiB minified Firebase SDK chunk (199.94 KiB gzip). It is isolated from the smaller application chunk; this is a performance follow-up rather than a failed build. The Vite build also prints upstream Zod annotation warnings that do not prevent the build.

The former `.env` file was removed from the current Git tree and `.env.example` contains no values. Removing it does not erase values from earlier public Git history; rotate any active or reused historical credentials.

See [MAINTENANCE_AUDIT.md](MAINTENANCE_AUDIT.md) for the source/dependency cleanup decision. The project Markdown guides are under `docs/`, with root `README.md` retained. The admin enquiry workspace opens a prefilled manual `mailto:` response and does not send or track email. Testimonials remain unpublished until exact client-approved copy and attribution are supplied.
