/**
 * Split calculation routes
 *
 * Handles CRUD for split rules/ratios and the calculation endpoint.
 */

import { Hono } from 'hono';
import { defaultOrganizerMiddleware } from '../middleware/auth';
import type { AppEnv } from '../middleware/auth';
import { calculateSplit } from '../lib/split';
import type { Rounding, ParticipantForSplit, RatioEntry } from '../lib/split';

const split = new Hono<AppEnv>();

// All split routes use default organizer
split.use('/*', defaultOrganizerMiddleware);

/**
 * Helper: Verify event ownership and return event data.
 */
async function verifyEventOwnership(
  db: D1Database,
  eventId: string,
  organizerId: string
): Promise<{ id: string; total_amount: number | null } | null> {
  return db
    .prepare('SELECT id, total_amount FROM events WHERE id = ? AND organizer_id = ?')
    .bind(eventId, organizerId)
    .first<{ id: string; total_amount: number | null }>();
}

/**
 * GET /api/events/:id/split
 * Get split rules and ratios for an event.
 */
split.get('/:id/split', async (c) => {
  const organizerId = c.get('organizerId');
  const eventId = c.req.param('id');

  const event = await verifyEventOwnership(c.env.DB, eventId, organizerId);
  if (!event) {
    return c.json({ error: 'Event not found' }, 404);
  }

  // Get split rule
  const rule = await c.env.DB.prepare(
    'SELECT * FROM split_rules WHERE event_id = ?'
  )
    .bind(eventId)
    .first<{ id: string; event_id: string; rounding: string }>();

  if (!rule) {
    return c.json({
      split_rule: null,
      ratios: [],
    });
  }

  // Get ratios for this rule
  const ratiosResult = await c.env.DB.prepare(
    'SELECT * FROM split_ratios WHERE split_rule_id = ? ORDER BY role, gender'
  )
    .bind(rule.id)
    .all();

  return c.json({
    split_rule: rule,
    ratios: ratiosResult.results,
  });
});

/**
 * PUT /api/events/:id/split
 * Save split rules and ratios.
 * Upserts the split rule and replaces all ratios.
 */
split.put('/:id/split', async (c) => {
  const organizerId = c.get('organizerId');
  const eventId = c.req.param('id');

  const event = await verifyEventOwnership(c.env.DB, eventId, organizerId);
  if (!event) {
    return c.json({ error: 'Event not found' }, 404);
  }

  const body = await c.req.json<{
    rounding: string;
    ratios: Array<{
      role: string;
      gender?: string | null;
      ratio: number;
    }>;
  }>();

  if (!body.rounding) {
    return c.json({ error: 'rounding is required' }, 400);
  }

  const validRounding = ['ceil_100', 'ceil_500', 'ceil_1000'];
  if (!validRounding.includes(body.rounding)) {
    return c.json({ error: 'rounding must be one of: ceil_100, ceil_500, ceil_1000' }, 400);
  }

  // Check for existing split rule
  const existingRule = await c.env.DB.prepare(
    'SELECT id FROM split_rules WHERE event_id = ?'
  )
    .bind(eventId)
    .first<{ id: string }>();

  let ruleId: string;

  if (existingRule) {
    ruleId = existingRule.id;
    // Update rounding
    await c.env.DB.prepare(
      'UPDATE split_rules SET rounding = ? WHERE id = ?'
    )
      .bind(body.rounding, ruleId)
      .run();

    // Delete existing ratios
    await c.env.DB.prepare(
      'DELETE FROM split_ratios WHERE split_rule_id = ?'
    )
      .bind(ruleId)
      .run();
  } else {
    ruleId = crypto.randomUUID();
    await c.env.DB.prepare(
      'INSERT INTO split_rules (id, event_id, rounding) VALUES (?, ?, ?)'
    )
      .bind(ruleId, eventId, body.rounding)
      .run();
  }

  // Insert new ratios
  if (body.ratios && body.ratios.length > 0) {
    const stmts = body.ratios.map((r) => {
      const ratioId = crypto.randomUUID();
      return c.env.DB.prepare(
        'INSERT INTO split_ratios (id, split_rule_id, role, gender, ratio) VALUES (?, ?, ?, ?, ?)'
      ).bind(ratioId, ruleId, r.role, r.gender || null, r.ratio);
    });

    await c.env.DB.batch(stmts);
  }

  // Return the saved data
  const rule = await c.env.DB.prepare(
    'SELECT * FROM split_rules WHERE id = ?'
  )
    .bind(ruleId)
    .first();

  const ratiosResult = await c.env.DB.prepare(
    'SELECT * FROM split_ratios WHERE split_rule_id = ? ORDER BY role, gender'
  )
    .bind(ruleId)
    .all();

  return c.json({
    split_rule: rule,
    ratios: ratiosResult.results,
  });
});

/**
 * POST /api/events/:id/split/calculate
 * Calculate split amounts for all attending participants.
 */
split.post('/:id/split/calculate', async (c) => {
  const organizerId = c.get('organizerId');
  const eventId = c.req.param('id');

  const event = await verifyEventOwnership(c.env.DB, eventId, organizerId);
  if (!event) {
    return c.json({ error: 'Event not found' }, 404);
  }

  if (!event.total_amount || event.total_amount <= 0) {
    return c.json({ error: 'Event total_amount must be set and greater than 0' }, 400);
  }

  // Get attending participants
  const participantsResult = await c.env.DB.prepare(
    `SELECT id, name, role, gender FROM participants
     WHERE event_id = ? AND attendance = 'attending'
     ORDER BY created_at ASC`
  )
    .bind(eventId)
    .all<{ id: string; name: string; role: string; gender: string | null }>();

  const attendingParticipants = participantsResult.results;

  if (attendingParticipants.length === 0) {
    return c.json({ error: 'No attending participants found' }, 400);
  }

  // Get split rules
  const rule = await c.env.DB.prepare(
    'SELECT * FROM split_rules WHERE event_id = ?'
  )
    .bind(eventId)
    .first<{ id: string; event_id: string; rounding: string }>();

  // Default rounding if no rule exists
  const rounding: Rounding = (rule?.rounding as Rounding) || 'ceil_100';

  // Get ratios
  let ratios: RatioEntry[] = [];
  if (rule) {
    const ratiosResult = await c.env.DB.prepare(
      'SELECT role, gender, ratio FROM split_ratios WHERE split_rule_id = ?'
    )
      .bind(rule.id)
      .all<{ role: string; gender: string | null; ratio: number }>();

    ratios = ratiosResult.results;
  }

  // Build participant input for split calculation
  const participantsForSplit: ParticipantForSplit[] = attendingParticipants.map((p) => ({
    id: p.id,
    role: p.role,
    gender: p.gender,
  }));

  // Calculate split
  const results = calculateSplit(
    event.total_amount,
    participantsForSplit,
    ratios,
    rounding
  );

  // Save assigned amounts to participants
  const updateStmts = results.map((r) =>
    c.env.DB.prepare(
      'UPDATE participants SET assigned_amount = ?, updated_at = ? WHERE id = ?'
    ).bind(r.amount, new Date().toISOString(), r.participantId)
  );

  if (updateStmts.length > 0) {
    await c.env.DB.batch(updateStmts);
  }

  // Build response with participant details
  const detailedResults = results.map((r) => {
    const participant = attendingParticipants.find((p) => p.id === r.participantId);
    return {
      participant_id: r.participantId,
      name: participant?.name || '',
      role: participant?.role || '',
      gender: participant?.gender || null,
      amount: r.amount,
    };
  });

  const totalCalculated = results.reduce((sum, r) => sum + r.amount, 0);

  return c.json({
    total_amount: event.total_amount,
    total_calculated: totalCalculated,
    rounding,
    participant_count: attendingParticipants.length,
    results: detailedResults,
  });
});

export default split;
