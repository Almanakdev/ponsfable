import { defineConfig, loadEnv } from 'vite';
import { xaiChat } from './server/xai-chat.js';

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
  return { plugins: [plugin] };
});
