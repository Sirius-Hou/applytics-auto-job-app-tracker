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
import { sendPasswordResetEmail } from './email.js';

const scrypt = promisify(scryptCallback);
const cookieName = 'applytics_session';
const sessionDays = 30;
const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
  password: z.string().min(5).max(200),
  displayName: z.string().trim().max(100).optional(),
});
const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
  password: z.string().min(1).max(200),
});
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(5).max(200),
});
const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
});
const resetPasswordSchema = z.object({
  token: z.string().min(32).max(300),
  password: z.string().min(5).max(200),
});
const deleteAccountSchema = z.object({
  confirmation: z.literal('DELETE'),
});

const resetWindowMs = 15 * 60 * 1000;
const resetAttempts = new Map<string, number[]>();
const resetLimit = (productionLimit: number) =>
  process.env.NODE_ENV === 'production' ? productionLimit : 100;
const genericResetMessage =
  'If an account uses that email, a password reset link will be sent shortly.';

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

function enforceResetRateLimit(key: string, maximum: number) {
  const now = Date.now();
  const recent = (resetAttempts.get(key) ?? []).filter((time) => now - time < resetWindowMs);
  if (recent.length >= maximum) {
    throw Object.assign(new Error('Too many password reset requests. Try again later.'), {
      status: 429,
    });
  }
  recent.push(now);
  resetAttempts.set(key, recent);
}

function passwordResetBaseUrl(requestBaseUrl: string) {
  const configured = process.env.APP_BASE_URL?.trim();
  const value = configured || requestBaseUrl;
  const url = new URL(value);
  if (process.env.NODE_ENV === 'production' && (url.protocol !== 'https:' || !configured)) {
    throw new Error('APP_BASE_URL must be configured with an HTTPS URL in production');
  }
  return url.origin;
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
  const value = loginSchema.parse(input);
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

export async function changePassword(userId: string, input: unknown) {
  const value = changePasswordSchema.parse(input);
  return transaction(async (client) => {
    const { rows } = await client.query<{ password_hash: string | null }>(
      'SELECT password_hash FROM users WHERE id=$1 FOR UPDATE',
      [userId],
    );
    const currentHash = rows[0]?.password_hash;
    if (!currentHash) {
      throw Object.assign(
        new Error('This account does not have a password. Use the email reset option instead.'),
        { status: 400 },
      );
    }
    if (!(await verifyPassword(value.currentPassword, currentHash))) {
      throw Object.assign(new Error('Current password is incorrect'), { status: 401 });
    }
    await client.query('UPDATE users SET password_hash=$1 WHERE id=$2', [
      await hashPassword(value.newPassword),
      userId,
    ]);
    await client.query(
      'UPDATE password_reset_tokens SET used_at=now() WHERE user_id=$1 AND used_at IS NULL',
      [userId],
    );
    return { changed: true };
  });
}

export async function requestPasswordReset(
  input: unknown,
  requestBaseUrl: string,
  requestIp: string,
) {
  const value = forgotPasswordSchema.parse(input);
  enforceResetRateLimit(`ip:${requestIp}`, resetLimit(5));
  enforceResetRateLimit(`email:${value.email}`, resetLimit(3));

  const { rows } = await pool.query('SELECT id,email FROM users WHERE email=$1', [value.email]);
  const user = rows[0] as { id: string; email: string } | undefined;
  if (!user) return { message: genericResetMessage };

  const token = randomBytes(32).toString('base64url');
  const hash = tokenHash(token);
  const tokenId = randomUUID();
  await transaction(async (client) => {
    await client.query(
      `UPDATE password_reset_tokens SET used_at=now()
       WHERE user_id=$1 AND used_at IS NULL`,
      [user.id],
    );
    await client.query(
      `INSERT INTO password_reset_tokens(id,user_id,token_hash,expires_at)
       VALUES($1,$2,$3,now() + interval '30 minutes')`,
      [tokenId, user.id, hash],
    );
  });

  const resetUrl = `${passwordResetBaseUrl(requestBaseUrl)}/reset-password?token=${encodeURIComponent(token)}`;
  try {
    const delivery = await sendPasswordResetEmail(user.email, resetUrl);
    return {
      message: genericResetMessage,
      ...(delivery === 'development' ? { developmentResetUrl: resetUrl } : {}),
    };
  } catch (error) {
    await pool.query('DELETE FROM password_reset_tokens WHERE id=$1', [tokenId]);
    console.error('Unable to send password reset email:', error);
    return { message: genericResetMessage };
  }
}

export async function resetPassword(input: unknown) {
  const value = resetPasswordSchema.parse(input);
  const hash = tokenHash(value.token);
  return transaction(async (client) => {
    const { rows } = await client.query(
      `SELECT id,user_id FROM password_reset_tokens
       WHERE token_hash=$1 AND used_at IS NULL AND expires_at>now()
       FOR UPDATE`,
      [hash],
    );
    const reset = rows[0] as { id: string; user_id: string } | undefined;
    if (!reset) {
      throw Object.assign(new Error('This password reset link is invalid or has expired.'), {
        status: 400,
      });
    }

    await client.query('UPDATE users SET password_hash=$1 WHERE id=$2', [
      await hashPassword(value.password),
      reset.user_id,
    ]);
    await client.query(
      'UPDATE password_reset_tokens SET used_at=now() WHERE user_id=$1 AND used_at IS NULL',
      [reset.user_id],
    );
    await client.query('DELETE FROM auth_sessions WHERE user_id=$1', [reset.user_id]);
    return { message: 'Your password has been reset. Sign in with your new password.' };
  });
}

export async function validatePasswordResetToken(input: unknown) {
  const { token } = resetPasswordSchema.pick({ token: true }).parse(input);
  const { rowCount } = await pool.query(
    `SELECT 1 FROM password_reset_tokens
     WHERE token_hash=$1 AND used_at IS NULL AND expires_at>now()`,
    [tokenHash(token)],
  );
  return { valid: Boolean(rowCount) };
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

export async function deleteAccount(userId: string, input: unknown, res: Response) {
  deleteAccountSchema.parse(input);

  await transaction(async (client) => {
    const user = await client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [userId]);
    if (!user.rowCount) {
      throw Object.assign(new Error('Account not found'), { status: 404 });
    }

    const { rows: ownedJobs } = await client.query<{ id: string; company_id: string | null }>(
      `SELECT DISTINCT j.id,j.company_id
       FROM applications a JOIN jobs j ON j.id=a.job_id
       WHERE a.user_id=$1`,
      [userId],
    );
    const jobIds = ownedJobs.map((job) => job.id);
    const companyIds = ownedJobs
      .map((job) => job.company_id)
      .filter((companyId): companyId is string => Boolean(companyId));
    const skillIds = jobIds.length
      ? (
          await client.query<{ skill_id: string }>(
            'SELECT DISTINCT skill_id FROM job_skills WHERE job_id=ANY($1::uuid[])',
            [jobIds],
          )
        ).rows.map((skill) => skill.skill_id)
      : [];

    // Cascades remove this user's applications, events, sessions, and reset tokens.
    await client.query('DELETE FROM users WHERE id=$1', [userId]);

    if (jobIds.length) {
      await client.query(
        `DELETE FROM jobs j
         WHERE j.id=ANY($1::uuid[])
           AND NOT EXISTS (SELECT 1 FROM applications a WHERE a.job_id=j.id)`,
        [jobIds],
      );
    }
    if (companyIds.length) {
      await client.query(
        `DELETE FROM companies c
         WHERE c.id=ANY($1::uuid[])
           AND NOT EXISTS (SELECT 1 FROM jobs j WHERE j.company_id=c.id)`,
        [companyIds],
      );
    }
    if (skillIds.length) {
      await client.query(
        `DELETE FROM skills s
         WHERE s.id=ANY($1::uuid[])
           AND NOT EXISTS (SELECT 1 FROM job_skills js WHERE js.skill_id=s.id)`,
        [skillIds],
      );
    }
  });

  clearSessionCookie(res);
  return { deleted: true };
}

export const googleClientId = () => process.env.GOOGLE_CLIENT_ID ?? null;
