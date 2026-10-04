import { createServer } from 'node:http';
import { createAgentHandler } from './api';

const port = Number(process.env.PORT || 3001);
createServer(createAgentHandler({ apiKey: process.env.OPENAI_API_KEY, model: process.env.OPENAI_MODEL })).listen(port, '127.0.0.1', () => {
  console.log(`Machine Playground API listening on http://127.0.0.1:${port}`);
});
