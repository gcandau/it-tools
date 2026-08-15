import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { createApp } from './app';

/**
 * Standalone Node server.
 *
 * Vercel is the primary deployment target for the API (see `api/[...route].ts`), but the same app
 * runs here so that `pnpm dev:api` works locally and so the self-hosted Docker image is not left
 * without an API. When `SERVE_STATIC` is set, the built SPA is served alongside it from `dist/`.
 */
const app = createApp();

if (process.env.SERVE_STATIC === 'true') {
  app.use('/*', serveStatic({ root: './dist' }));
  app.get('*', serveStatic({ path: './dist/index.html' }));
}

const port = Number(process.env.PORT ?? 3000);

serve({ fetch: app.fetch, port }, ({ port: boundPort }) => {
  // eslint-disable-next-line no-console
  console.log(`IT Tools API listening on http://localhost:${boundPort}/api/docs`);
});
