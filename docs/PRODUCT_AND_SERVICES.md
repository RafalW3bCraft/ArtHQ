# ArtHQ products and services

## Company

ArtHQ is an English-only website and app studio and a subsidiary of RafalW3bCraft. The public site presents selected work, available services, the delivery process, contact options, and a client portal.

### Business and service structure

The public offer is organized around the existing project brief categories: websites, mobile apps, AI assistants, Telegram bots, e-commerce, and other digital work. Visitors can review work, choose a category in the client brief, or contact ArtHQ with an early idea. The portal supports project updates and support requests; it does not claim automated email delivery, guaranteed timelines, or fixed pricing.

The homepage sequence is: studio positioning and parent relationship → Hall of Achievement → services → how a project moves from brief to build → contact. The header keeps work, services, contact, and client sign-in visible.

## Public portfolio

| Entry | What visitors see | Destination |
| --- | --- | --- |
| RafalW3bCraft | Cybersecurity portfolio for the parent company | <https://rafalwebcraft.online/> |
| 4AM SOCIETY | Coffee brand and coffee-origin journal | <https://the4amsociety.com/> |
| Ribison Chemicals | Chemical manufacturing website | <https://ribison.com/> |
| Creative Laser Art | Website for a bespoke hardwood laser cutting and engraving atelier | <https://creativelaser-art.web.app/> |
| FinServiceBot | Telegram bot project | <https://t.me/FinServiceBot> |
| Smart Growly Bot | Telegram bot project | <https://t.me/Smart_Growly_Bot> |

Portfolio descriptions are intentionally limited to details verified from the linked work or supplied project names. The six entries are presented in an accessible horizontal carousel. Client testimonials are not published until the exact quotation, attribution, and permission to publish have been confirmed.

## Services visitors can request

Clients can submit a brief for a website, Telegram bot, AI assistant, mobile app, e-commerce project, or another service. A signed-in client can view project status and open support tickets. Staff can review briefs and enquiries, update project statuses, and process tickets. Service cards explain these options without changing the Firestore schema.

### Public routes

| Route | Purpose |
| --- | --- |
| `/` | Portfolio, Hall of Achievement gallery, contact form, and project entry point |
| `/auth` | Email/password registration and sign-in |
| `/dashboard` | Client project tracking and support tickets |
| `/admin` | Staff project, ticket, enquiry, and client review |
| `/api/health` | JSON health response identifying ArtHQ |

## Support contacts

- [support@arthq.tech](mailto:support@arthq.tech) — client portal and general ArtHQ support.
- [info@rafalwebcraft.online](mailto:info@rafalwebcraft.online) — parent-company and general enquiries.

These addresses are offered as email links. The site does not deliver mail itself. Contact form submissions are stored in Firestore for admin review; admins use their mail client to reply manually. Configure and test mailbox hosting separately with the domain/email provider.

## Application services

| Service | Responsibility | Configuration / data |
| --- | --- | --- |
| React and Vite static application | Public portfolio, authentication screens, client portal, admin portal | Build output: `dist/public` |
| Firebase Authentication | Email/password client and admin sign-in | Provider and authorized domains are configured in Firebase Console |
| Cloud Firestore | Profiles, project briefs, support tickets, and contact enquiries | `users`, `projects`, `support_messages`, `contact_submissions`; rules and indexes are in the repository |
| Firebase Hosting | Static production hosting, route rewrites, and preview channels | Configured in `firebase.json`; domain records are supplied by Firebase Console |
| Firebase emulators | Local Auth and Firestore security/workflow verification | Loopback only; use demo project IDs |

### Access boundaries

- Clients create and read their own profile, project briefs, and support tickets.
- Staff status changes and contact-enquiry access are controlled by Firestore rules.
- A user's client account cannot grant itself an admin role. Trusted project operators assign admin access through the Firebase Console.
- Contact submissions are public writes with validated fields and admin-only reads.

### Operator documentation

- Setup, deploy, preview, and local verification: [README](../README.md)
- Product and interface architecture: [ARCHITECTURE](ARCHITECTURE.md)
- Visual system, accessibility, and motion: [DESIGN](DESIGN.md)
- Technical and on-page search audit: [SEO_AUDIT](SEO_AUDIT.md)
- Staff identity and trusted role assignment: [ADMIN_SETUP](ADMIN_SETUP.md)
- Collection rules, ownership, and status transitions: [Firestore security rules](FIRESTORE_SECURITY_RULES.md)
- Required public Firebase web settings: [.env.example](../.env.example)

## Launch status

Firebase project `arthq-tech` is live at <https://arthq-tech.web.app/>. Firebase Hosting has pending custom-domain DNS setup for `arthq.tech` and the `www` redirect; see [LAUNCH_RUNBOOK.md](LAUNCH_RUNBOOK.md). The one-week preview channel was used for browser QA and expires on 2026-11-26. A successful local build does not prove mailbox delivery or custom-domain HTTPS. Record the release checks and update this status after DNS and HTTPS are confirmed.
