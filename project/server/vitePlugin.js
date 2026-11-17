/** Plugin Vite mỏng: gắn Express app lên dev server, `npm run dev` vẫn chỉ một lệnh. */
import { createApp } from './app.js';

export function mysqlApiPlugin(env) {
  return {
    name: 'mysql-api-plugin',
    configureServer(server) {
      const { app, close } = createApp(env);
      server.httpServer?.once('close', close);
      server.middlewares.use((req, res, next) => (req.url.startsWith('/api/') ? app(req, res, next) : next()));
    }
  };
}
