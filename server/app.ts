import express from 'express';
import { ZodError } from 'zod';
import { resolve } from 'node:path';
import { api } from './routes.js';
export const app = express();
// Local app: deny cross-origin writes, including simple form requests.
app.use((req, res, next) => {
  const origin = req.get('origin');
  const isLocalDevelopmentOrigin =
    process.env.NODE_ENV !== 'production' &&
    /^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(origin ?? '');
  if (
    origin &&
    origin !== `http://${req.get('host')}` &&
    origin !== `https://${req.get('host')}` &&
    !isLocalDevelopmentOrigin
  ) {
    res.status(403).json({ error: 'Origin not allowed' });
    return;
  }
  next();
});
app.use(express.json({ limit: '2mb' }));
app.use('/api', api);
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'API route not found' });
});
app.use(express.static(resolve('dist')));
app.get('*', (_req, res) => res.sendFile(resolve('dist/index.html')));
app.use(((err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res
      .status(400)
      .json({ error: err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') });
    return;
  }
  if (err instanceof SyntaxError) {
    res.status(400).json({ error: 'Invalid JSON' });
    return;
  }
  if (typeof err?.status === 'number') {
    res.status(err.status).json({ error: err.message });
    return;
  }
  console.error(err);
  res
    .status(500)
    .json({ error: 'Unable to complete request. Check PostgreSQL connection and server logs.' });
}) as express.ErrorRequestHandler);
