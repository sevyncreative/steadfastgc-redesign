# Steadfast Construction — Redesign

Independent architectural editorial redesign. Original production repo and domain are unchanged.

## Stack
Static HTML, CSS, and progressive JavaScript. No build step or dependencies. Deploy the repository root on Vercel with Other framework preset. Clean URLs configured in vercel.json.

## Content
Preserves the original services, detailed service pages, four project pages, contact details, contractor licenses, and Instant Roofer integration. Brand mark extracted from original source; photographs are original site assets hosted on Framer. Instant Roofer remains a third-party embed. The original EventGallery provider returns `/* embed unavailable */`; project covers and descriptions are preserved, with a contact CTA replacing empty gallery frames. Original gallery IDs: e-dKQ240728, bfAbY240728, 2xbWz240728, UrrfC240728. Restore additional gallery photos when the business supplies an export. Direct phone and email are the contact methods, matching the source site.

## Editing
Shared design: styles.css. Navigation and estimator behavior: script.js. Each route has its own HTML file.

## Review before production domain cutover
Legacy Tesla performance, savings, warranty claims on detailed pages are retained from source and should be confirmed by the business. Original roof-repair detail includes a driveway/sidewalk service list; retained to avoid silently dropping content.
