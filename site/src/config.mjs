// One place for the site name and address (CLAUDE.md "Naming"). Domain bought 2026-11-23 (Cloudflare Registrar).
export const SITE_NAME = 'World Traffic Cameras';
export const SITE_URL = (process.env.PUBLIC_SITE_URL || 'https://worldtrafficcameras.com').replace(/\/$/, '');
// Launch switch: PUBLIC_NOINDEX=1 hides EVERY page from search (noindex meta, robots.txt Disallow, empty sitemap).
// The production workflow sets it until the owner sets the repository variable LAUNCH=live.
export const NOINDEX_ALL = process.env.PUBLIC_NOINDEX === '1';
export const MIN_CAMERAS = 3; // pages below this are noindex and not in the sitemap
