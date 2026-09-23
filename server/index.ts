import 'dotenv/config';
import { app } from './app.js';
const host = process.env.HOST || (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1');
const port = Number(process.env.PORT || 3001);
app.listen(port, host, () => console.log(`Applytics: http://${host}:${port}`));
