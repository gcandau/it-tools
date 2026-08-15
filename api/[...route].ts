import { handle } from 'hono/vercel';
import { createApp } from '../server/app';

/**
 * Vercel entry point for the whole API.
 *
 * A single catch-all function rather than one file per endpoint: it keeps the function count flat
 * as endpoints are added, and it means the exact same Hono app is exercised by the unit tests and
 * by the local Node server in `server/index.ts`.
 *
 * The Node runtime is required — `bcryptjs` and `node-forge` do not run on the edge runtime.
 */
export const config = { runtime: 'nodejs' };

const app = createApp();

export default handle(app);
