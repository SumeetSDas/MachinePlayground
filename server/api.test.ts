import { createServer } from 'node:http';
import type { Server } from 'node:http';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAgentHandler } from './api';
import { interpretWithOpenAI } from './interpret';
import { examples } from '../src/agent/problem';

const servers: Server[] = [];
afterEach(async () => { await Promise.all(servers.splice(0).map(server => new Promise<void>(resolve => server.close(() => resolve())))); });
async function serve(options: Parameters<typeof createAgentHandler>[0] = {}) {
  const server = createServer(createAgentHandler(options)); servers.push(server);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No address');
  const base = `http://127.0.0.1:${address.port}`;
  return { base, post: (body: unknown, headers: Record<string, string> = {}) => fetch(`${base}/api/agent/interpret`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) }) };
}
const request = { problem: 'Find effort for this lever', context: null };

describe('bounded agent gateway', () => {
  it('reports missing credentials clearly', async () => {
    const app = await serve();
    expect(await (await fetch(`${app.base}/api/agent/status`)).json()).toEqual({ configured: false });
    expect((await app.post(request)).status).toBe(503);
  });
  it('passes structured extraction and context, but rejects malformed input', async () => {
    const interpret = vi.fn().mockResolvedValue(examples[0].interpretation);
    const app = await serve({ interpret });
    const response = await app.post(request);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ interpretation: examples[0].interpretation });
    expect(interpret).toHaveBeenCalledWith(request.problem, null);
    expect((await app.post({ problem: 'x'.repeat(2001), context: null })).status).toBe(400);
    expect((await app.post({ ...request, code: 'execute' })).status).toBe(400);
    expect((await app.post(request, { Origin: 'https://untrusted.example' })).status).toBe(403);
    expect((await app.post(request, { 'Content-Type': 'text/plain' })).status).toBe(415);
  });
  it('rejects oversized requests and rate limits a client', async () => {
    const app = await serve({ interpret: async () => examples[0].interpretation });
    expect((await app.post({ ...request, problem: 'x'.repeat(13000) })).status).toBe(413);
    for (let i = 0; i < 7; i++) expect((await app.post(request)).status).toBe(200);
    expect((await app.post(request)).status).toBe(429);
  });
  it('returns safe errors for provider failure and invalid provider output', async () => {
    const app = await serve({ interpret: async () => { throw new Error('secret provider detail'); } });
    const response = await app.post(request);
    expect(response.status).toBe(502);
    expect(JSON.stringify(await response.json())).not.toContain('secret');
    const invalid = await serve({ interpret: async () => ({ arbitrary: 'code' }) as never });
    expect((await invalid.post(request)).status).toBe(502);
  });
  it('uses a strict Responses schema without executing a real model call', async () => {
    let payload: Record<string, unknown> = {};
    const fakeFetch: typeof fetch = async (_input, init) => {
      payload = JSON.parse(init!.body as string);
      return new Response(JSON.stringify({ id: 'resp_test', object: 'response', created_at: 1, status: 'completed', error: null, incomplete_details: null, output: [{ id: 'msg_test', type: 'message', role: 'assistant', status: 'completed', content: [{ type: 'output_text', text: JSON.stringify(examples[0].interpretation), annotations: [] }] }] }), { headers: { 'Content-Type': 'application/json' } });
    };
    expect(await interpretWithOpenAI('lever', null, { apiKey: 'test-only', model: 'gpt-4o-mini', fetch: fakeFetch })).toEqual(examples[0].interpretation);
    expect(payload.store).toBe(false);
    expect(payload.max_output_tokens).toBe(2048);
    expect((payload.text as { format: { strict: boolean } }).format.strict).toBe(true);
  });
});
