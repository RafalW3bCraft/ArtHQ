# ArtHQ technical and on-page SEO audit

**Audit date:** 2026-11-19
**Scope:** repository source and production build configuration. Search Console, ranking history, backlink data, and external crawler data were not available in this audit.

## Findings and resolutions

| Priority | Finding | Resolution / verification |
| --- | --- | --- |
| Medium | Homepage metadata described only selected work and did not make the studio services clear. | Updated HTML title, description, Open Graph, and X/Twitter previews to describe websites, apps, assistants, bots, and commerce. Check built HTML for matching values. |
| Medium | No sitemap was present. | Added `client/public/sitemap.xml` with the canonical public homepage and referenced it in `robots.txt`. Check that both files are copied into `dist/public`. |
| Low | Organization JSON-LD identified the parent relationship but omitted service context and support contact. | Added a factual organization description, service topics, customer-support email, English language, and existing parent organization. Parse and validate JSON in the built page. |
| Pass | Canonical URL already pointed at `https://arthq.tech/`. | Retained it; verify the custom domain and HTTPS after DNS is active. |
| Pass | Auth, dashboard, and admin routes were blocked in `robots.txt` and had `noindex` response metadata/headers. | Retained those exclusions. Confirm direct routes continue to receive `noindex` after deployment. |
| Pass | Public project cards link directly to their work; the header and project-start action provide internal paths to contact and portal flows. | Retained descriptive navigation and direct project links; verify all six destinations in browser QA. |

## Page intent

The root route is the only indexable public route. Its primary intent is to introduce ArtHQ as a website/app studio and show selected work. Authentication, client workspace, and admin workspace are operational routes, not landing pages, and stay `noindex`.

## Structured data and social preview

The root page uses `Organization` JSON-LD for ArtHQ, its parent, services, and support contact. It does not claim a physical office, ratings, awards, client testimonials, or unverified business metrics. The social image remains `/media/social.jpg`; verify the built image is present and reachable.

## Release checks and limitations

- Verify `canonical`, title, description, Open Graph/X metadata, JSON-LD, `robots.txt`, and sitemap in `dist/public` and the Firebase preview.
- Verify social image and all portfolio destinations return successfully; third-party availability can change independently.
- Check mobile layout, text wrapping, and load performance on the preview. The Firebase SDK currently produces a large separate bundle; assess its transfer and rendering impact before adjusting build splitting.
- Re-run domain and HTTPS checks after Get.tech DNS changes. Source metadata alone does not prove that custom-domain redirects or TLS are active.
- No keyword-volume or ranking targets are asserted. Add service-specific indexable pages only when there is substantive content to support distinct search intent.
