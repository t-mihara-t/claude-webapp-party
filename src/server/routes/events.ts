/**
 * Event CRUD routes
 *
 * Uses default organizer middleware (no auth).
 * GET /api/events/:id/public remains a separate public endpoint.
 */

import { Hono } from 'hono';
import { defaultOrganizerMiddleware } from '../middleware/auth';
import type { AppEnv } from '../middleware/auth';

const events = new Hono<AppEnv>();

// Apply default organizer middleware to all routes except public endpoint
events.use('/*', async (c, next) => {
  if (c.req.path.endsWith('/public') && c.req.method === 'GET') {
    return next();
  }
  return defaultOrganizerMiddleware(c, next);
});

/**
 * GET /api/events
 * List all events for the organizer.
 */
events.get('/', async (c) => {
  const organizerId = c.get('organizerId');

  const result = await c.env.DB.prepare(
    `SELECT e.*,
       (SELECT COUNT(*) FROM participants p WHERE p.event_id = e.id) as participant_count,
       (SELECT COUNT(*) FROM participants p WHERE p.event_id = e.id AND p.attendance = 'attending') as attending_count
     FROM events e
     WHERE e.organizer_id = ?
     ORDER BY e.event_date DESC`
  )
    .bind(organizerId)
    .all();

  return c.json({ events: result.results });
});

/**
 * POST /api/events
 * Create a new event.
 */
events.post('/', async (c) => {
  const organizerId = c.get('organizerId');
  const body = await c.req.json<{
    title: string;
    description?: string;
    event_date: string;
    venue_name?: string;
    venue_address?: string;
    venue_url?: string;
    budget_per_person?: number;
    total_amount?: number;
    status?: string;
    paypay_link?: string;
  }>();

  if (!body.title || !body.event_date) {
    return c.json({ error: 'title and event_date are required' }, 400);
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const status = body.status || 'draft';

  await c.env.DB.prepare(
    `INSERT INTO events (id, organizer_id, title, description, event_date, venue_name, venue_address, venue_url, budget_per_person, total_amount, status, paypay_link, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      organizerId,
      body.title,
      body.description || null,
      body.event_date,
      body.venue_name || null,
      body.venue_address || null,
      body.venue_url || null,
      body.budget_per_person || null,
      body.total_amount || null,
      status,
      body.paypay_link || null,
      now,
      now
    )
    .run();

  const event = await c.env.DB.prepare('SELECT * FROM events WHERE id = ?')
    .bind(id)
    .first();

  return c.json({ event }, 201);
});

/**
 * GET /api/events/:id
 * Get event detail with participant counts.
 */
events.get('/:id', async (c) => {
  const organizerId = c.get('organizerId');
  const eventId = c.req.param('id');

  const event = await c.env.DB.prepare(
    `SELECT e.*,
       (SELECT COUNT(*) FROM participants p WHERE p.event_id = e.id) as participant_count,
       (SELECT COUNT(*) FROM participants p WHERE p.event_id = e.id AND p.attendance = 'attending') as attending_count,
       (SELECT COUNT(*) FROM participants p WHERE p.event_id = e.id AND p.attendance = 'declined') as declined_count,
       (SELECT COUNT(*) FROM participants p WHERE p.event_id = e.id AND p.attendance = 'pending') as pending_count
     FROM events e
     WHERE e.id = ? AND e.organizer_id = ?`
  )
    .bind(eventId, organizerId)
    .first();

  if (!event) {
    return c.json({ error: 'Event not found' }, 404);
  }

  return c.json({ event });
});

/**
 * PUT /api/events/:id
 * Update an event.
 */
events.put('/:id', async (c) => {
  const organizerId = c.get('organizerId');
  const eventId = c.req.param('id');

  // Verify ownership
  const existing = await c.env.DB.prepare(
    'SELECT id FROM events WHERE id = ? AND organizer_id = ?'
  )
    .bind(eventId, organizerId)
    .first();

  if (!existing) {
    return c.json({ error: 'Event not found' }, 404);
  }

  const body = await c.req.json<{
    title?: string;
    description?: string;
    event_date?: string;
    venue_name?: string;
    venue_address?: string;
    venue_url?: string;
    budget_per_person?: number;
    total_amount?: number;
    status?: string;
    paypay_link?: string;
  }>();

  const now = new Date().toISOString();

  // Build dynamic update query
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (body.title !== undefined) { fields.push('title = ?'); values.push(body.title); }
  if (body.description !== undefined) { fields.push('description = ?'); values.push(body.description || null); }
  if (body.event_date !== undefined) { fields.push('event_date = ?'); values.push(body.event_date); }
  if (body.venue_name !== undefined) { fields.push('venue_name = ?'); values.push(body.venue_name || null); }
  if (body.venue_address !== undefined) { fields.push('venue_address = ?'); values.push(body.venue_address || null); }
  if (body.venue_url !== undefined) { fields.push('venue_url = ?'); values.push(body.venue_url || null); }
  if (body.budget_per_person !== undefined) { fields.push('budget_per_person = ?'); values.push(body.budget_per_person); }
  if (body.total_amount !== undefined) { fields.push('total_amount = ?'); values.push(body.total_amount); }
  if (body.status !== undefined) { fields.push('status = ?'); values.push(body.status); }
  if (body.paypay_link !== undefined) { fields.push('paypay_link = ?'); values.push(body.paypay_link || null); }

  fields.push('updated_at = ?');
  values.push(now);
  values.push(eventId);

  if (fields.length > 1) {
    await c.env.DB.prepare(
      `UPDATE events SET ${fields.join(', ')} WHERE id = ?`
    )
      .bind(...values)
      .run();
  }

  const event = await c.env.DB.prepare('SELECT * FROM events WHERE id = ?')
    .bind(eventId)
    .first();

  return c.json({ event });
});

/**
 * DELETE /api/events/:id
 * Delete an event and its related data (cascading via FK).
 */
events.delete('/:id', async (c) => {
  const organizerId = c.get('organizerId');
  const eventId = c.req.param('id');

  // Verify ownership
  const existing = await c.env.DB.prepare(
    'SELECT id FROM events WHERE id = ? AND organizer_id = ?'
  )
    .bind(eventId, organizerId)
    .first();

  if (!existing) {
    return c.json({ error: 'Event not found' }, 404);
  }

  await c.env.DB.prepare('DELETE FROM events WHERE id = ?')
    .bind(eventId)
    .run();

  return c.json({ message: 'Event deleted successfully' });
});

/**
 * GET /api/events/:id/public
 * Public event info for participant page (no organizer context needed).
 */
events.get('/:id/public', async (c) => {
  const eventId = c.req.param('id');

  const event = await c.env.DB.prepare(
    `SELECT
       e.id, e.title, e.description, e.event_date, e.venue_name,
       e.venue_address, e.venue_url, e.budget_per_person, e.status, e.paypay_link,
       o.name as organizer_name, o.avatar_url as organizer_avatar,
       (SELECT COUNT(*) FROM participants p WHERE p.event_id = e.id AND p.attendance = 'attending') as attending_count
     FROM events e
     JOIN organizers o ON e.organizer_id = o.id
     WHERE e.id = ?`
  )
    .bind(eventId)
    .first();

  if (!event) {
    return c.json({ error: 'Event not found' }, 404);
  }

  return c.json({ event });
});

export default events;
