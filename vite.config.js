import { defineConfig, loadEnv } from 'vite';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { xaiChat } from './server/xai-chat.js';

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const plugin = {
    name: 'xai-chat',
    configureServer(server) {
      server.middlewares.use(xaiChat(env.XAI_API_KEY));
    },
    configurePreviewServer(server) {
      server.middlewares.use(xaiChat(env.XAI_API_KEY));
    },
  };
  return {
    plugins: [plugin],
    build: {
      rollupOptions: {
        input: {
          main: resolve(root, 'index.html'),
          token: resolve(root, 'token.html'),
        },
      },
    },
  };
});
