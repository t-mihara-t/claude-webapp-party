/**
 * Cloudflare Pages Functions catch-all for /api/* routes.
 * Delegates all API requests to the Hono app.
 */
import app from '../../src/server/index';

interface Env {
  DB: D1Database;
  HOTPEPPER_API_KEY: string;
}

export const onRequest: PagesFunction<Env> = (context) => {
  return app.fetch(context.request, context.env, context);
};
