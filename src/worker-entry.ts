/**
 * Cloudflare Pages _worker.js entry point (Advanced Mode).
 *
 * Handles API routes via Hono and serves static assets
 * for all other requests with SPA fallback.
 */
import app from './server/index';

export default {
  async fetch(request: Request, env: Record<string, unknown>, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Handle API routes with Hono
    if (url.pathname.startsWith('/api/') || url.pathname === '/api') {
      return app.fetch(request, env, ctx);
    }

    // Serve static assets
    const assets = env.ASSETS as { fetch: typeof fetch };
    try {
      const response = await assets.fetch(request);
      if (response.status !== 404) {
        return response;
      }
    } catch {
      // Fall through to SPA fallback
    }

    // SPA fallback - serve index.html for client-side routes
    return assets.fetch(new Request(new URL('/', request.url), request));
  },
};
