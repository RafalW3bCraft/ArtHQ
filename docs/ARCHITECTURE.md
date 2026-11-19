# ArtHQ application architecture

## Product and audience

ArtHQ is a subsidiary of RafalW3bCraft and presents itself as a website and app studio. The public site introduces services and selected work, collects enquiries, and links new clients to a project brief. Authenticated clients follow their own briefs and support tickets. Trusted admins review enquiries and update project/ticket statuses.

## Runtime

```text
Browser
  └─ React + Wouter single-page app
      ├─ Public portfolio, services, contact form
      ├─ Firebase Authentication (email/password)
      └─ Firestore web SDK
          ├─ users
          ├─ projects
          ├─ support_messages
          └─ contact_submissions

Vite build → dist/public → Firebase Hosting
                           ├─ /api/health → health.json
                           └─ application routes → index.html
```

## Application surfaces

- `/`: studio introduction, Hall of Achievement carousel, services, delivery process, contact enquiry.
- `/auth`: email/password registration and sign-in.
- `/dashboard`: client-owned projects and support tickets.
- `/admin`: trusted admin review of projects, tickets, enquiries, and users.
- `/api/health`: static JSON health response identifying ArtHQ.

The public site renders without Firebase configuration. Firebase-backed forms explain when the service is unavailable. Portal routes remain unavailable until Firebase settings are configured.

## Data and access boundaries

- Firebase Authentication supplies the signed-in UID. Client reads/writes are owner-scoped by Firestore rules.
- Users create their own client profile; `admin` role assignment is restricted to trusted project operators through the Firebase Console.
- Users with the trusted `admin` role can update project/ticket statuses and review contact submissions. Admins reply to public enquiries from their mail client using a prefilled `mailto:` link; ArtHQ does not send email or record email delivery.
- Contact form writes are validated. Contact records are admin-readable only.
- Firestore rules and required indexes are versioned in `firestore.rules` and `firestore.indexes.json`; emulator tests cover authorization and status transitions.

## Authentication lifecycle

Firebase Authentication owns email/password identity. After sign-in, the portal subscribes to the caller's Firestore profile. New accounts create their profile transactionally; if an authenticated account has no profile, the portal asks the user to complete it before opening a workspace. Sign-out clears the Firebase session and returns the browser to client sign-in. Authentication and profile-loading failures show an actionable message; user-scoped data remains protected by Firestore rules.

No server, SQL database, cart, checkout, or archive API is part of the ArtHQ runtime.

## UI and motion

The global stylesheet defines light/dark design tokens and shared form, portal, and state styles. The project rail uses native horizontal scrolling and scroll snap, with previous/next/pause controls and reduced-motion-aware autoplay. Autoplay pauses during pointer hover, keyboard focus, and manual navigation. Play explicitly resumes motion; a new hover or focus interaction and all manual navigation pause it again. Intersection Observer only enhances visibility; the content remains available without it. Details are in [DESIGN.md](DESIGN.md).

## Delivery and operational documents

- Local setup, emulator tests, preview, and deploy: [README](../README.md)
- Firestore access policy: [FIRESTORE_SECURITY_RULES](FIRESTORE_SECURITY_RULES.md)
- Trusted staff assignment: [ADMIN_SETUP](ADMIN_SETUP.md)
- Product, services, routes, and support: [PRODUCT_AND_SERVICES](PRODUCT_AND_SERVICES.md)
- SEO audit: [SEO_AUDIT](SEO_AUDIT.md)
- Custom-domain checks: [LAUNCH_RUNBOOK](LAUNCH_RUNBOOK.md)
- Dependency and source-file audit: [MAINTENANCE_AUDIT](MAINTENANCE_AUDIT.md)
