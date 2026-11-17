/** Đọc project/.env (nếu có) rồi gộp với process.env. File .env KHÔNG được commit. */
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export function loadEnv() {
  const file = fileURLToPath(new URL('../.env', import.meta.url));
  if (existsSync(file)) process.loadEnvFile(file);
  return { ...process.env };
}
