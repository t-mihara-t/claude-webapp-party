/**
 * Main Hono app entry point
 *
 * Mounts all API routes under /api.
 * Exported as default for Cloudflare Pages Functions _worker.ts compatibility.
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { AppEnv } from './middleware/auth';
import events from './routes/events';
import participants from './routes/participants';
import restaurants from './routes/restaurants';
import split from './routes/split';

const app = new Hono<AppEnv>();

// CORS middleware for development
app.use('/api/*', cors({
  origin: (origin) => origin || '*',
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Health check (no DB required)
app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    db_available: !!c.env.DB,
  });
});

// D1 database availability check
app.use('/api/*', async (c, next) => {
  if (!c.env.DB) {
    return c.json({
      error: 'Database not configured',
      message: 'D1 database binding "DB" is not available. Please configure the D1 binding in Cloudflare Pages settings: Workers & Pages > nomi-kai-manager > Settings > Bindings > D1 Database.',
    }, 503);
  }
  return next();
});

// Mount route modules
app.route('/api/events', events);

// Participant routes are nested under events
app.route('/api/events', participants);

// Restaurant search
app.route('/api/restaurants', restaurants);

// Split routes are nested under events
app.route('/api/events', split);

// 404 handler for API routes
app.notFound((c) => {
  if (c.req.path.startsWith('/api')) {
    return c.json({ error: 'Not found' }, 404);
  }
  // For non-API routes, let Cloudflare Pages handle static assets
  return c.json({ error: 'Not found' }, 404);
});

// Global error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json(
    {
      error: 'Internal server error',
      message: err instanceof Error ? err.message : 'Unknown error',
    },
    500
  );
});

export default app;
