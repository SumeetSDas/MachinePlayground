import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { createAgentHandler } from './server/api';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'OPENAI_');
  return {
    base: mode === 'pages' ? '/MachinePlayground/' : '/',
    plugins: [react(), {
      name: 'machine-agent-api',
      configureServer(server) {
        const handler = createAgentHandler({ apiKey: process.env.OPENAI_API_KEY || env.OPENAI_API_KEY, model: process.env.OPENAI_MODEL || env.OPENAI_MODEL });
        server.middlewares.use('/api/agent', (req, res) => { req.url = `/api/agent${req.url}`; void handler(req, res); });
      },
    }],
    preview: { proxy: mode === 'pages' ? undefined : { '/api/agent': 'http://127.0.0.1:3001' } },
  };
});
