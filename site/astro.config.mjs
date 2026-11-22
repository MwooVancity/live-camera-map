import { defineConfig } from 'astro/config';

// PUBLIC_SITE_URL is the real domain once Mike picks one; until then canonicals use a placeholder.
export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || 'https://nearbycams.example',
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory' },
  devToolbar: { enabled: false },
});
