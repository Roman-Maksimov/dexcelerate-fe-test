import tailwindcss from '@tailwindcss/vite';
// import basicSsl from '@vitejs/plugin-basic-ssl';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig(() => {
  return {
    // plugins: [basicSsl(), react(), tailwindcss()],
    plugins: [react(), tailwindcss()],
    server: {
      watch: {
        usePolling: true,
      },
    },
  };
});
