# ArtHQ source and dependency audit

## Findings

- `client/src/hooks/use-mobile.tsx` had no importers or references and was removed.
- No direct runtime or development dependency was unused. Firebase powers authentication/data access and emulator rules tests; React/React DOM and Wouter run the UI; Zod validates shared records; Vite and its React plugin build the app; TypeScript and the React/Node types check it; Playwright Core runs browser workflows.
- Local fonts remain in use: Bricolage Grotesque for display headings, Inter for body text, Fira Code for technical labels, and DM Sans as a fallback. The four project screenshots are referenced by the gallery, and the social card is referenced by Open Graph metadata.
- Firebase configuration, schema/rules/indexes, documentation, tests, and design preview artifacts remain part of the project. Generated `dist`, Firebase CLI cache/logs, `.agents`, and local environment files are ignored or machine-local; they are not source cleanup targets.
- The project's top-level Markdown guides were organized under `docs/` with `docs/README.md` as an index. Root `README.md` remains the setup entry point. The installed `.agents` tree was left at its required path. ECC's full docs audit surfaced five broken relative links in installed skill/workflow files; those upstream installation files were not rewritten. Project documentation links pass the local-link check.

## Environment and credentials

`.env.local` and `.env.legacy.local` remain ignored and were not read or modified. The tracked `.env` removal is already part of the previous commit; no Git history rewrite was performed. Any credentials from historical commits should remain rotated if they were ever active or reused.

## Verification

The direct dependency inventory was checked with `npm ls --depth=0`, and the source was reviewed for import usage. The homepage hero uses static typography. The gallery Play control resumes autoplay after explicit activation; new hover/focus interaction or manual navigation pauses it, and reduced-motion disables autoplay. The admin enquiry view uses a `mailto:` link for a manual response; ArtHQ does not send mail or track delivery. Re-run `npm run check`, `npm run build`, and `npm audit --omit=dev` after future dependency or source pruning.
