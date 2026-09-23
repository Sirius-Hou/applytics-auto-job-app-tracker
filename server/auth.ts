import {
  createHash,
  randomBytes,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';
import type { Request, RequestHandler, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { z } from 'zod';
import { pool, transaction } from './db/pool.js';

const scrypt = promisify(scryptCallback);
const cookieName = 'applytics_session';
const sessionDays = 30;
const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
  password: z.string().min(10).max(200),
  displayName: z.string().trim().max(100).optional(),
});

export type AuthUser = { id: string; email: string; displayName: string | null };

const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const key = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt}$${key.toString('hex')}`;
}

async function verifyPassword(password: string, encoded: string) {
  const [algorithm, salt, expectedHex] = encoded.split('$');
  if (algorithm !== 'scrypt' || !salt || !expectedHex) return false;
  const expected = Buffer.from(expectedHex, 'hex');
  const actual = (await scrypt(password, salt, expected.length)) as Buffer;
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function parseCookies(req: Request) {
  return Object.fromEntries(
    (req.get('cookie') ?? '')
      .split(';')
      .map((part) => part.trim().split('='))
      .filter(([key, value]) => key && value)
      .map(([key, value]) => [key, decodeURIComponent(value)]),
  );
}

function setSessionCookie(res: Response, token: string) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${cookieName}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${sessionDays * 86400}${secure}`,
  );
}

function clearSessionCookie(res: Response) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${cookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`);
}

async function createSession(user: AuthUser, res: Response) {
  const token = randomBytes(32).toString('base64url');
  await pool.query(
    `INSERT INTO auth_sessions(token_hash,user_id,expires_at)
     VALUES($1,$2,now() + ($3 || ' days')::interval)`,
    [tokenHash(token), user.id, sessionDays],
  );
  setSessionCookie(res, token);
  return user;
}

export async function currentUser(req: Request): Promise<AuthUser | null> {
  const token = parseCookies(req)[cookieName];
  if (!token) return null;
  const { rows } = await pool.query(
    `SELECT u.id,u.email,u.display_name AS "displayName"
     FROM auth_sessions s JOIN users u ON u.id=s.user_id
     WHERE s.token_hash=$1 AND s.expires_at>now()`,
    [tokenHash(token)],
  );
  return rows[0] ?? null;
}

export const requireUser: RequestHandler = async (req, res, next) => {
  try {
    const user = await currentUser(req);
    if (!user) {
      res.status(401).json({ error: 'Sign in to continue' });
      return;
    }
    res.locals.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

export async function registerWithPassword(input: unknown, res: Response) {
  const value = credentialsSchema.parse(input);
  return transaction(async (client) => {
    const existing = await client.query('SELECT 1 FROM users WHERE email=$1', [value.email]);
    if (existing.rowCount)
      throw Object.assign(new Error('An account already uses this email'), { status: 409 });
    const id = randomUUID();
    const user: AuthUser = { id, email: value.email, displayName: value.displayName || null };
    await client.query(
      'INSERT INTO users(id,email,password_hash,display_name) VALUES($1,$2,$3,$4)',
      [id, value.email, await hashPassword(value.password), user.displayName],
    );
    const userCount = Number((await client.query('SELECT count(*) FROM users')).rows[0].count);
    if (userCount === 1)
      await client.query('UPDATE applications SET user_id=$1 WHERE user_id IS NULL', [id]);
    const token = randomBytes(32).toString('base64url');
    await client.query(
      `INSERT INTO auth_sessions(token_hash,user_id,expires_at)
       VALUES($1,$2,now() + ($3 || ' days')::interval)`,
      [tokenHash(token), id, sessionDays],
    );
    setSessionCookie(res, token);
    return user;
  });
}

export async function loginWithPassword(input: unknown, res: Response) {
  const value = credentialsSchema.pick({ email: true, password: true }).parse(input);
  const { rows } = await pool.query(
    'SELECT id,email,password_hash,display_name AS "displayName" FROM users WHERE email=$1',
    [value.email],
  );
  const record = rows[0];
  if (!record?.password_hash || !(await verifyPassword(value.password, record.password_hash))) {
    throw Object.assign(new Error('Incorrect email or password'), { status: 401 });
  }
  return createSession(
    { id: record.id, email: record.email, displayName: record.displayName },
    res,
  );
}

export async function loginWithGoogle(input: unknown, res: Response) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw Object.assign(new Error('Google login is not configured'), { status: 503 });
  const { credential } = z.object({ credential: z.string().min(20) }).parse(input);
  const ticket = await new OAuth2Client(clientId).verifyIdToken({
    idToken: credential,
    audience: clientId,
  });
  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email || !payload.email_verified)
    throw Object.assign(new Error('Google did not provide a verified email'), { status: 401 });
  const email = payload.email.toLowerCase();
  const user = await transaction(async (client) => {
    let result = await client.query(
      'SELECT id,email,display_name AS "displayName" FROM users WHERE google_sub=$1 OR email=$2 LIMIT 1',
      [payload.sub, email],
    );
    if (result.rowCount) {
      await client.query(
        'UPDATE users SET google_sub=coalesce(google_sub,$2),display_name=coalesce(display_name,$3) WHERE id=$1',
        [result.rows[0].id, payload.sub, payload.name ?? null],
      );
      return {
        ...result.rows[0],
        displayName: result.rows[0].displayName ?? payload.name ?? null,
      } as AuthUser;
    }
    const id = randomUUID();
    await client.query('INSERT INTO users(id,email,google_sub,display_name) VALUES($1,$2,$3,$4)', [
      id,
      email,
      payload.sub,
      payload.name ?? null,
    ]);
    const userCount = Number((await client.query('SELECT count(*) FROM users')).rows[0].count);
    if (userCount === 1)
      await client.query('UPDATE applications SET user_id=$1 WHERE user_id IS NULL', [id]);
    return { id, email, displayName: payload.name ?? null };
  });
  return createSession(user, res);
}

export async function logout(req: Request, res: Response) {
  const token = parseCookies(req)[cookieName];
  if (token) await pool.query('DELETE FROM auth_sessions WHERE token_hash=$1', [tokenHash(token)]);
  clearSessionCookie(res);
}

export const googleClientId = () => process.env.GOOGLE_CLIENT_ID ?? null;
