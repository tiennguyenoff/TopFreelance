import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import { mysqlApiPlugin } from './server/vitePlugin.js';
import { ramTestApiPlugin } from './server/ramTestApi.js';

// Thông tin kết nối MySQL đọc từ project/.env (không commit) — xem project/.env.example
export default defineConfig(({ mode }) => {
  const env = { ...process.env, ...loadEnv(mode, process.cwd(), '') };
  return {
    // ramTestApiPlugin đứng trước: middleware MySQL trả 404 cho mọi /api/* nó không biết
    plugins: [vue(), ramTestApiPlugin(), mysqlApiPlugin(env)],
    server: {
      // Mặc định chỉ nghe trên máy này: API có quyền ghi vào MySQL nên không mở ra mạng LAN.
      // Muốn demo trên điện thoại cùng mạng: đặt TF_HOST=0.0.0.0 trong .env (tự chịu rủi ro).
      host: env.TF_HOST || '127.0.0.1',
      port: 5173,
      open: false,
      // Cho phép truy cập qua tunnel ngrok (npm run share). Chỉ liệt kê đúng host của tunnel.
      allowedHosts: ['unencounterable-arrestive-charolette.ngrok-free.dev']
    },
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            three: ['three']
          }
        }
      }
    }
  };
});
