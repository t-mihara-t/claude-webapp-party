/**
 * Participant management routes
 *
 * Mix of protected (organizer) and public (participant self-service) endpoints.
 */

import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import type { AppEnv } from '../middleware/auth';

const participants = new Hono<AppEnv>();

/**
 * GET /api/events/:id/participants
 * List all participants for an event (protected).
 */
participants.get('/:id/participants', authMiddleware, async (c) => {
  const organizerId = c.get('organizerId');
  const eventId = c.req.param('id');

  // Verify the organizer owns this event
  const event = await c.env.DB.prepare(
    'SELECT id FROM events WHERE id = ? AND organizer_id = ?'
  )
    .bind(eventId, organizerId)
    .first();

  if (!event) {
    return c.json({ error: 'Event not found' }, 404);
  }

  const result = await c.env.DB.prepare(
    `SELECT * FROM participants WHERE event_id = ? ORDER BY created_at ASC`
  )
    .bind(eventId)
    .all();

  return c.json({ participants: result.results });
});

/**
 * POST /api/events/:id/participants
 * Add a participant (NO auth required - for self-registration from participant page).
 */
participants.post('/:id/participants', async (c) => {
  const eventId = c.req.param('id');

  // Verify event exists and is open
  const event = await c.env.DB.prepare(
    'SELECT id, status FROM events WHERE id = ?'
  )
    .bind(eventId)
    .first<{ id: string; status: string }>();

  if (!event) {
    return c.json({ error: 'Event not found' }, 404);
  }

  if (event.status !== 'open' && event.status !== 'draft') {
    return c.json({ error: 'Event is not accepting participants' }, 400);
  }

  const body = await c.req.json<{
    name: string;
    attendance?: string;
    role?: string;
    gender?: string;
  }>();

  if (!body.name) {
    return c.json({ error: 'name is required' }, 400);
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await c.env.DB.prepare(
    `INSERT INTO participants (id, event_id, name, attendance, role, gender, payment_status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'unpaid', ?, ?)`
  )
    .bind(
      id,
      eventId,
      body.name,
      body.attendance || 'pending',
      body.role || 'member',
      body.gender || null,
      now,
      now
    )
    .run();

  const participant = await c.env.DB.prepare(
    'SELECT * FROM participants WHERE id = ?'
  )
    .bind(id)
    .first();

  return c.json({ participant }, 201);
});

/**
 * PUT /api/events/:id/participants/:pid
 * Update a participant.
 * Protected for role/amount/payment_status changes.
 * No auth required for attendance-only updates (detected by request body).
 */
participants.put('/:id/participants/:pid', async (c) => {
  const eventId = c.req.param('id');
  const participantId = c.req.param('pid');

  const body = await c.req.json<{
    name?: string;
    attendance?: string;
    role?: string;
    gender?: string;
    assigned_amount?: number;
    payment_status?: string;
  }>();

  // Determine if this is an attendance-only update (public) or a full update (protected)
  const isAttendanceOnly = body.attendance !== undefined &&
    body.role === undefined &&
    body.assigned_amount === undefined &&
    body.payment_status === undefined &&
    body.name === undefined &&
    body.gender === undefined;

  if (!isAttendanceOnly) {
    // Protected: require auth
    const authResult = await authMiddleware(c, async () => {});
    if (authResult) return authResult;

    const organizerId = c.get('organizerId');

    // Verify ownership
    const event = await c.env.DB.prepare(
      'SELECT id FROM events WHERE id = ? AND organizer_id = ?'
    )
      .bind(eventId, organizerId)
      .first();

    if (!event) {
      return c.json({ error: 'Event not found' }, 404);
    }
  }

  // Verify participant exists for this event
  const existing = await c.env.DB.prepare(
    'SELECT id FROM participants WHERE id = ? AND event_id = ?'
  )
    .bind(participantId, eventId)
    .first();

  if (!existing) {
    return c.json({ error: 'Participant not found' }, 404);
  }

  const now = new Date().toISOString();
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (body.name !== undefined) { fields.push('name = ?'); values.push(body.name); }
  if (body.attendance !== undefined) { fields.push('attendance = ?'); values.push(body.attendance); }
  if (body.role !== undefined) { fields.push('role = ?'); values.push(body.role); }
  if (body.gender !== undefined) { fields.push('gender = ?'); values.push(body.gender || null); }
  if (body.assigned_amount !== undefined) { fields.push('assigned_amount = ?'); values.push(body.assigned_amount); }
  if (body.payment_status !== undefined) { fields.push('payment_status = ?'); values.push(body.payment_status); }

  fields.push('updated_at = ?');
  values.push(now);
  values.push(participantId);

  if (fields.length > 1) {
    await c.env.DB.prepare(
      `UPDATE participants SET ${fields.join(', ')} WHERE id = ?`
    )
      .bind(...values)
      .run();
  }

  const participant = await c.env.DB.prepare(
    'SELECT * FROM participants WHERE id = ?'
  )
    .bind(participantId)
    .first();

  return c.json({ participant });
});

/**
 * DELETE /api/events/:id/participants/:pid
 * Remove a participant (protected).
 */
participants.delete('/:id/participants/:pid', authMiddleware, async (c) => {
  const organizerId = c.get('organizerId');
  const eventId = c.req.param('id');
  const participantId = c.req.param('pid');

  // Verify ownership
  const event = await c.env.DB.prepare(
    'SELECT id FROM events WHERE id = ? AND organizer_id = ?'
  )
    .bind(eventId, organizerId)
    .first();

  if (!event) {
    return c.json({ error: 'Event not found' }, 404);
  }

  const existing = await c.env.DB.prepare(
    'SELECT id FROM participants WHERE id = ? AND event_id = ?'
  )
    .bind(participantId, eventId)
    .first();

  if (!existing) {
    return c.json({ error: 'Participant not found' }, 404);
  }

  await c.env.DB.prepare('DELETE FROM participants WHERE id = ?')
    .bind(participantId)
    .run();

  return c.json({ message: 'Participant removed successfully' });
});

/**
 * POST /api/events/:id/respond
 * Public endpoint for attendance response.
 * Allows participants to respond by name + attendance status.
 */
participants.post('/:id/respond', async (c) => {
  const eventId = c.req.param('id');

  // Verify event exists
  const event = await c.env.DB.prepare(
    'SELECT id, status FROM events WHERE id = ?'
  )
    .bind(eventId)
    .first<{ id: string; status: string }>();

  if (!event) {
    return c.json({ error: 'Event not found' }, 404);
  }

  if (event.status === 'closed' || event.status === 'settled') {
    return c.json({ error: 'Event is no longer accepting responses' }, 400);
  }

  const body = await c.req.json<{
    name: string;
    attendance: string;
  }>();

  if (!body.name || !body.attendance) {
    return c.json({ error: 'name and attendance are required' }, 400);
  }

  if (!['attending', 'declined', 'pending'].includes(body.attendance)) {
    return c.json({ error: 'attendance must be attending, declined, or pending' }, 400);
  }

  // Check if participant already exists by name for this event
  const existing = await c.env.DB.prepare(
    'SELECT id FROM participants WHERE event_id = ? AND name = ?'
  )
    .bind(eventId, body.name)
    .first<{ id: string }>();

  const now = new Date().toISOString();

  if (existing) {
    // Update existing participant's attendance
    await c.env.DB.prepare(
      'UPDATE participants SET attendance = ?, updated_at = ? WHERE id = ?'
    )
      .bind(body.attendance, now, existing.id)
      .run();

    const participant = await c.env.DB.prepare(
      'SELECT * FROM participants WHERE id = ?'
    )
      .bind(existing.id)
      .first();

    return c.json({ participant, updated: true });
  } else {
    // Create new participant with attendance response
    const id = crypto.randomUUID();

    await c.env.DB.prepare(
      `INSERT INTO participants (id, event_id, name, attendance, role, payment_status, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'member', 'unpaid', ?, ?)`
    )
      .bind(id, eventId, body.name, body.attendance, now, now)
      .run();

    const participant = await c.env.DB.prepare(
      'SELECT * FROM participants WHERE id = ?'
    )
      .bind(id)
      .first();

    return c.json({ participant, updated: false }, 201);
  }
});

export default participants;
