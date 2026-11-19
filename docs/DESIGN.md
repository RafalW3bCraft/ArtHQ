# ArtHQ visual system

## Product direction

ArtHQ is a digital studio that builds websites, mobile apps, AI assistants, Telegram bots, and e-commerce experiences. The public site should help visitors understand the work, select a service, and begin a brief; returning clients use the Firebase portal to follow projects and request support. ArtHQ is a subsidiary of RafalW3bCraft.

The visual direction combines the archive’s warm amber accents, technical type labels, and horizontal product gallery with ArtHQ’s existing editorial portfolio. The result uses real project screenshots and concise factual copy. It does not use the archive’s coffee-shop branding, cart/checkout flows, custom cursor, particle effects, or 3D concepts.

## Tokens and typography

`design-tokens.json` is the reference for colors, type roles, spacing, breakpoints, and motion. `design-preview.html` is a dependency-free preview of the main surfaces and theme tokens.

- **Display:** Bricolage Grotesque, already bundled locally, for expressive headlines.
- **Body:** locally bundled Inter for clear interface and long-form reading.
- **Technical labels:** locally bundled Fira Code for project types, indices, and small metadata.
- **Surfaces:** warm ivory and white in light mode; charcoal and deep green-black in dark mode.
- **Accent:** rust/amber for actions and indices; green for inline links and supporting actions.
- **Shape:** mostly square corners, thin rules, and restrained image mats; avoid decorative nested cards.
- The homepage hero uses a static two-level headline: the service phrase carries the display scale and the supporting line sits slightly smaller for clearer hierarchy and steadier wrapping across breakpoints.

Inter and Fira Code are bundled from the Google Fonts distributions and their OFL licenses are included in `client/public/fonts`. Existing DM Sans and Bricolage Grotesque assets remain available locally.

## Layout and behavior

- The homepage leads with the website/app studio offer and a clear project-start action.
- The Hall of Achievement presents six website and bot projects in a horizontal scroll-snap carousel. It advances every 6.5 seconds only while visible and not paused, pauses on hover/focus/manual interaction, and stops automatically for reduced-motion preferences.
- Previous, next, and pause/play controls are keyboard accessible. Touch users can swipe; the rail can be focused and navigated with arrow keys.
- Services match the supported project brief types. A four-step process explains the real portal-supported brief, project update, and support workflow.
- Intersection Observer reveals elements once; content remains visible when JavaScript, Intersection Observer, or motion is unavailable.
- Authentication, client dashboard, and admin workspace retain the same color tokens, focus states, form controls, and record states.

## Accessibility and performance

Use semantic headings and links, visible `:focus-visible`, labeled controls, readable contrast, and controls at least 44px high. Honor `prefers-reduced-motion`; never hide content unless the reveal enhancement is active. Images reserve their dimensions and load lazily except the preloaded Inter font and normal above-the-fold content. Avoid 3D models, WebGL, autoplaying video, remote font requests, and added animation dependencies.

## Archive review

The reviewed archive is a Replit workspace with a React/Vite coffee storefront, a component sandbox, and an API/Drizzle backend. Its `Gallery`, `Hero`, and CSS patterns informed the ArtHQ horizontal work rail, warm dark/accent contrast, typography roles, and restrained interaction feedback. The archive also describes procedural 3D interactions, AI coffee matching, cart and checkout behavior, and a PostgreSQL order backend; these do not serve ArtHQ’s existing portfolio/client-portal purpose and were not copied.
