/**
 * App types and default organizer setup.
 *
 * Authentication is not yet implemented.
 * All organizer routes use a default organizer ID.
 */

import type { MiddlewareHandler } from 'hono';

export const DEFAULT_ORGANIZER_ID = 'default-organizer';

export type Bindings = {
  DB: D1Database;
  HOTPEPPER_API_KEY: string;
};

export type Variables = {
  organizerId: string;
};

export type AppEnv = {
  Bindings: Bindings;
  Variables: Variables;
};

/**
 * Middleware that sets a default organizer ID.
 * Replace with real authentication later.
 */
export const defaultOrganizerMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  c.set('organizerId', DEFAULT_ORGANIZER_ID);

  // Auto-create default organizer if not exists
  const existing = await c.env.DB.prepare(
    'SELECT id FROM organizers WHERE id = ?'
  )
    .bind(DEFAULT_ORGANIZER_ID)
    .first();

  if (!existing) {
    const now = new Date().toISOString();
    await c.env.DB.prepare(
      `INSERT INTO organizers (id, google_id, email, name, created_at, updated_at)
       VALUES (?, '', '', '幹事', ?, ?)`
    )
      .bind(DEFAULT_ORGANIZER_ID, now, now)
      .run();
  }

  await next();
};
