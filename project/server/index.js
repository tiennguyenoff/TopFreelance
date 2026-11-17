/** Chạy thật: node server/index.js (lệnh `npm start`). */
import { createApp } from './app.js';
import { loadEnv } from './env.js';
import { fileURLToPath } from 'node:url';

const env = loadEnv();
const { app } = createApp(env, { distDir: fileURLToPath(new URL('../dist', import.meta.url)) });
const port = Number(env.PORT) || 3000;
app.listen(port, env.TF_HOST || '127.0.0.1', () => console.log(`TopFreelance server: http://localhost:${port}`));
