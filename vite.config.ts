import tailwindcss from '@tailwindcss/vite';
// import basicSsl from '@vitejs/plugin-basic-ssl';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    // plugins: [basicSsl(), react(), tailwindcss()],
    plugins: [react(), tailwindcss()],
    server: {
      watch: {
        usePolling: true,
      },
      proxy: {
        '/api': {
          target: env.VITE_API_URL,
          changeOrigin: true,
          secure: true,
          rewrite: path => path.replace(/^\/api/, ''),
        },
        '/ws': {
          target: env.VITE_WS_URL,
          changeOrigin: true,
          secure: true,
        },
      },
    },
  };
});
