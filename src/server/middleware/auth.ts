/**
 * JWT Authentication Middleware
 *
 * Uses Web Crypto API (SubtleCrypto) for HMAC-SHA256 signing/verification.
 * JWT is stored in a cookie named `auth_token`.
 * On successful verification, sets `organizerId` in the Hono context.
 */

import type { Context, MiddlewareHandler } from 'hono';
import { getCookie } from 'hono/cookie';

// ---- Base64URL encoding/decoding utilities ----

function base64urlEncode(data: ArrayBuffer | Uint8Array): string {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDecode(str: string): Uint8Array {
  // Restore standard base64
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  // Add padding
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function textEncode(str: string): ArrayBuffer {
  const encoded = new TextEncoder().encode(str);
  return encoded.buffer as ArrayBuffer;
}

function textDecode(data: ArrayBuffer | Uint8Array): string {
  return new TextDecoder().decode(data);
}

// ---- Crypto Key import ----

async function getSigningKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    textEncode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

// ---- JWT functions ----

export interface JWTPayload {
  sub: string; // organizer ID
  email: string;
  name: string;
  iat: number;
  exp: number;
}

/**
 * Create a signed JWT token.
 */
export async function signJWT(payload: JWTPayload, secret: string): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };

  const headerEncoded = base64urlEncode(textEncode(JSON.stringify(header)));
  const payloadEncoded = base64urlEncode(textEncode(JSON.stringify(payload)));

  const signingInput = `${headerEncoded}.${payloadEncoded}`;
  const key = await getSigningKey(secret);

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    textEncode(signingInput)
  );

  const signatureEncoded = base64urlEncode(signature);

  return `${signingInput}.${signatureEncoded}`;
}

/**
 * Verify and decode a JWT token.
 * Returns the payload if valid, null otherwise.
 */
export async function verifyJWT(token: string, secret: string): Promise<JWTPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const [headerEncoded, payloadEncoded, signatureEncoded] = parts;

    // Verify signature
    const signingInput = `${headerEncoded}.${payloadEncoded}`;
    const key = await getSigningKey(secret);
    const signatureBytes = base64urlDecode(signatureEncoded);
    const signatureBuffer = signatureBytes.buffer as ArrayBuffer;

    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBuffer,
      textEncode(signingInput)
    );

    if (!isValid) {
      return null;
    }

    // Decode payload
    const payloadJson = textDecode(base64urlDecode(payloadEncoded));
    const payload: JWTPayload = JSON.parse(payloadJson);

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

// ---- Hono Types ----

export type Bindings = {
  DB: D1Database;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  JWT_SECRET: string;
  HOTPEPPER_API_KEY: string;
};

export type Variables = {
  organizerId: string;
};

export type AppEnv = {
  Bindings: Bindings;
  Variables: Variables;
};

// ---- Auth Middleware ----

/**
 * Hono middleware that verifies the JWT from the `auth_token` cookie.
 * On success, sets `c.set('organizerId', payload.sub)`.
 * On failure, returns 401 Unauthorized.
 */
export const authMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  const token = getCookie(c, 'auth_token');

  if (!token) {
    return c.json({ error: 'Unauthorized: No auth token provided' }, 401);
  }

  const payload = await verifyJWT(token, c.env.JWT_SECRET);

  if (!payload) {
    return c.json({ error: 'Unauthorized: Invalid or expired token' }, 401);
  }

  c.set('organizerId', payload.sub);

  await next();
};
