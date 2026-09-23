import { Router, type RequestHandler, type Response } from 'express';
import { z } from 'zod';
import {
  createSchema,
  parseInput,
  filterSchema,
  updateSchema,
  eventSchema,
  analyticsFilterSchema,
} from '../shared/contracts.js';
import { parseJobDescription } from './ai/job-parser/agent.js';
import * as applications from './repositories/applications.js';
import { pool } from './db/pool.js';
import {
  currentUser,
  googleClientId,
  loginWithGoogle,
  loginWithPassword,
  logout,
  registerWithPassword,
  requireUser,
  type AuthUser,
} from './auth.js';
export const api = Router();
const route =
  (fn: RequestHandler): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
const id = (value: unknown) => z.string().uuid().parse(value);
const userId = (res: Response) => (res.locals.user as AuthUser).id;
api.get('/auth/config', (_req, res) => res.json({ googleClientId: googleClientId() }));
api.get(
  '/auth/session',
  route(async (req, res) => {
    const user = await currentUser(req);
    res.status(user ? 200 : 401).json(user ?? { error: 'Not signed in' });
  }),
);
api.post(
  '/auth/register',
  route(async (req, res) => res.status(201).json(await registerWithPassword(req.body, res))),
);
api.post(
  '/auth/login',
  route(async (req, res) => res.json(await loginWithPassword(req.body, res))),
);
api.post(
  '/auth/google',
  route(async (req, res) => res.json(await loginWithGoogle(req.body, res))),
);
api.post(
  '/auth/logout',
  route(async (req, res) => {
    await logout(req, res);
    res.json({ ok: true });
  }),
);
api.get(
  '/health',
  route(async (_req, res) => {
    await pool.query('SELECT 1');
    res.json({ ok: true });
  }),
);
api.use(requireUser);
api.post(
  '/parse',
  route(async (req, res) => {
    const v = parseInput.parse(req.body);
    const parsed = await parseJobDescription(v.rawJd);
    res.json({
      ...parsed.data,
      rawJd: v.rawJd,
      originalUrl: v.originalUrl,
      canonicalUrl: null,
      parserModel: parsed.metadata.model,
      parserVersion: 'v1',
    });
  }),
);
api.patch(
  '/applications/:id/events/:eventId',
  route(async (req, res) => {
    const result = await applications.updateEvent(
      userId(res),
      id(req.params.id),
      id(req.params.eventId),
      eventSchema.parse(req.body),
    );
    res.status(result ? 200 : 404).json(result ?? { error: 'Application event not found' });
  }),
);
api.delete(
  '/applications/:id/events/:eventId',
  route(async (req, res) => {
    const result = await applications.deleteEvent(
      userId(res),
      id(req.params.id),
      id(req.params.eventId),
    );
    res.status(result ? 200 : 404).json(result ?? { error: 'Application event not found' });
  }),
);
api.get(
  '/skills',
  route(async (req, res) => {
    const limit = z.coerce.number().int().min(1).max(500).default(100).parse(req.query.limit);
    res.json({ items: await applications.listSkillStats(userId(res), limit) });
  }),
);
api.get(
  '/roles',
  route(async (_req, res) => {
    res.json({ items: await applications.listRoleStats(userId(res)) });
  }),
);
api.get(
  '/analytics/overview',
  route(async (req, res) => {
    res.json(
      await applications.getApplicationOverview(
        userId(res),
        analyticsFilterSchema.parse(req.query),
      ),
    );
  }),
);
api.post(
  '/applications',
  route(async (req, res) => {
    res
      .status(201)
      .json(await applications.createApplication(userId(res), createSchema.parse(req.body)));
  }),
);
api.get(
  '/applications',
  route(async (req, res) => {
    res.json(await applications.listApplications(userId(res), filterSchema.parse(req.query)));
  }),
);
api.get(
  '/applications/:id',
  route(async (req, res) => {
    const result = await applications.getApplication(userId(res), id(req.params.id));
    res.status(result ? 200 : 404).json(result ?? { error: 'Application not found' });
  }),
);
api.delete(
  '/applications/:id',
  route(async (req, res) => {
    const deleted = await applications.deleteApplication(userId(res), id(req.params.id));
    res
      .status(deleted ? 200 : 404)
      .json(deleted ? { deleted: true } : { error: 'Application not found' });
  }),
);
api.patch(
  '/applications/:id',
  route(async (req, res) => {
    const result = await applications.updateApplication(
      userId(res),
      id(req.params.id),
      updateSchema.parse(req.body),
    );
    res.status(result ? 200 : 404).json(result ?? { error: 'Application not found' });
  }),
);
api.post(
  '/applications/:id/events',
  route(async (req, res) => {
    const result = await applications.addEvent(
      userId(res),
      id(req.params.id),
      eventSchema.parse(req.body),
    );
    res.status(result ? 201 : 404).json(result ?? { error: 'Application not found' });
  }),
);
