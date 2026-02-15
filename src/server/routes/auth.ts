/**
 * Google OAuth authentication routes
 *
 * Handles login, callback, user info, and logout.
 */

import { Hono } from 'hono';
import { setCookie, deleteCookie, getCookie } from 'hono/cookie';
import { signJWT, verifyJWT, authMiddleware } from '../middleware/auth';
import type { AppEnv } from '../middleware/auth';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

const auth = new Hono<AppEnv>();

/**
 * GET /api/auth/login
 * Redirects to Google OAuth consent screen.
 */
auth.get('/login', (c) => {
  const redirectUri = new URL('/api/auth/callback', c.req.url).toString();

  const params = new URLSearchParams({
    client_id: c.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
  });

  return c.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
});

/**
 * GET /api/auth/callback
 * Handles the Google OAuth callback.
 * Exchanges authorization code for tokens, fetches user info,
 * upserts the organizer in D1, creates a JWT, and sets a cookie.
 */
auth.get('/callback', async (c) => {
  const code = c.req.query('code');
  const error = c.req.query('error');

  if (error) {
    return c.json({ error: `OAuth error: ${error}` }, 400);
  }

  if (!code) {
    return c.json({ error: 'No authorization code provided' }, 400);
  }

  const redirectUri = new URL('/api/auth/callback', c.req.url).toString();

  // Exchange code for tokens
  const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: c.env.GOOGLE_CLIENT_ID,
      client_secret: c.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }).toString(),
  });

  if (!tokenResponse.ok) {
    const errorBody = await tokenResponse.text();
    return c.json({ error: 'Failed to exchange authorization code', details: errorBody }, 500);
  }

  const tokenData = (await tokenResponse.json()) as {
    access_token: string;
    id_token: string;
    refresh_token?: string;
  };

  // Fetch user info from Google
  const userInfoResponse = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  if (!userInfoResponse.ok) {
    return c.json({ error: 'Failed to fetch user info from Google' }, 500);
  }

  const userInfo = (await userInfoResponse.json()) as {
    id: string;
    email: string;
    name: string;
    picture?: string;
  };

  // Upsert organizer in D1
  const organizerId = crypto.randomUUID();
  const now = new Date().toISOString();

  // Check if organizer already exists
  const existing = await c.env.DB.prepare(
    'SELECT id FROM organizers WHERE google_id = ?'
  )
    .bind(userInfo.id)
    .first<{ id: string }>();

  let actualOrganizerId: string;

  if (existing) {
    // Update existing organizer
    actualOrganizerId = existing.id;
    await c.env.DB.prepare(
      'UPDATE organizers SET email = ?, name = ?, avatar_url = ?, updated_at = ? WHERE id = ?'
    )
      .bind(userInfo.email, userInfo.name, userInfo.picture || null, now, actualOrganizerId)
      .run();
  } else {
    // Insert new organizer
    actualOrganizerId = organizerId;
    await c.env.DB.prepare(
      'INSERT INTO organizers (id, google_id, email, name, avatar_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )
      .bind(actualOrganizerId, userInfo.id, userInfo.email, userInfo.name, userInfo.picture || null, now, now)
      .run();
  }

  // Create JWT (expires in 7 days)
  const jwtPayload = {
    sub: actualOrganizerId,
    email: userInfo.email,
    name: userInfo.name,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
  };

  const token = await signJWT(jwtPayload, c.env.JWT_SECRET);

  // Set auth cookie
  setCookie(c, 'auth_token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });

  // Redirect to organizer dashboard
  return c.redirect('/organizer');
});

/**
 * GET /api/auth/me
 * Returns the current authenticated user's info.
 * Protected by auth middleware.
 */
auth.get('/me', authMiddleware, async (c) => {
  const organizerId = c.get('organizerId');

  const organizer = await c.env.DB.prepare(
    'SELECT id, email, name, avatar_url, paypay_link, created_at, updated_at FROM organizers WHERE id = ?'
  )
    .bind(organizerId)
    .first();

  if (!organizer) {
    return c.json({ error: 'Organizer not found' }, 404);
  }

  return c.json({ organizer });
});

/**
 * POST /api/auth/logout
 * Clears the auth cookie.
 */
auth.post('/logout', (c) => {
  deleteCookie(c, 'auth_token', {
    path: '/',
  });

  return c.json({ message: 'Logged out successfully' });
});

export default auth;
