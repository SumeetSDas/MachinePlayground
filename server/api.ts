import type { IncomingMessage, ServerResponse } from 'node:http';
import { compileProblem, requestSchema } from '../src/agent/problem';
import type { Interpretation } from '../src/agent/problem';
import { interpretWithOpenAI } from './interpret';

type Options = { apiKey?: string; model?: string; interpret?: (problem: string, context: Interpretation | null) => Promise<Interpretation>; now?: () => number };
const respond = (res: ServerResponse, status: number, body: unknown) => {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(body));
};

/** Same-origin, bounded gateway. In production put shared quotas and auth at the edge. */
export function createAgentHandler(options: Options = {}) {
  const clients = new Map<string, { time: number; count: number }>();
  let active = 0;
  let globalWindow = { time: 0, count: 0 };
  return async (req: IncomingMessage, res: ServerResponse) => {
    const url = req.url?.split('?')[0];
    if (url === '/api/agent/status' && req.method === 'GET') {
      respond(res, 200, { configured: Boolean(options.apiKey || options.interpret) }); return;
    }
    if (url !== '/api/agent/interpret') { respond(res, 404, { error: 'Not found.' }); return; }
    if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); respond(res, 405, { error: 'Use POST.' }); return; }
    const origin = req.headers.origin;
    if (origin) {
      try { if (new URL(origin).host !== req.headers.host) { respond(res, 403, { error: 'Cross-origin requests are not allowed.' }); return; } }
      catch { respond(res, 403, { error: 'Invalid origin.' }); return; }
    }
    if (!req.headers['content-type']?.startsWith('application/json')) { respond(res, 415, { error: 'Send JSON.' }); return; }
    if (!options.apiKey && !options.interpret) { respond(res, 503, { error: 'AI is not connected. Set OPENAI_API_KEY in the server environment and restart. You can still try the labelled examples.' }); return; }
    const now = options.now?.() ?? Date.now();
    for (const [key, value] of clients) if (now - value.time >= 60000) clients.delete(key);
    const ip = req.socket.remoteAddress || 'local';
    const entry = clients.get(ip) ?? { time: now, count: 0 };
    if (now - globalWindow.time >= 60000) globalWindow = { time: now, count: 0 };
    if (entry.count >= 8 || globalWindow.count >= 100 || active >= 3 || clients.size >= 1000 && !clients.has(ip)) {
      res.setHeader('Retry-After', '60'); respond(res, 429, { error: 'The workshop is busy. Please wait a minute and try again.' }); return;
    }
    entry.count++; clients.set(ip, entry); globalWindow.count++;
    const timer = setTimeout(() => { if (!res.writableEnded) respond(res, 408, { error: 'Request timed out. Try again.' }); req.destroy(); }, 10000);
    let bytes = 0;
    const chunks: Buffer[] = [];
    try {
      for await (const chunk of req) {
        bytes += chunk.length;
        if (bytes > 12000) { respond(res, 413, { error: 'Problem request is too large.' }); req.resume(); return; }
        chunks.push(Buffer.from(chunk));
      }
    } catch { if (!res.writableEnded) respond(res, 400, { error: 'Could not read the request.' }); return; }
    finally { clearTimeout(timer); }
    let raw: unknown;
    try { raw = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
    catch { respond(res, 400, { error: 'Invalid JSON.' }); return; }
    const request = requestSchema.safeParse(raw);
    if (!request.success) { respond(res, 400, { error: 'Provide a problem of 1–2000 characters and valid context.' }); return; }
    active++;
    try {
      const interpretation = await (options.interpret ? options.interpret(request.data.problem, request.data.context) : interpretWithOpenAI(request.data.problem, request.data.context, { apiKey: options.apiKey!, model: options.model || 'gpt-4o-mini' }));
      const compiled = compileProblem(interpretation);
      if (!compiled.ok && compiled.kind === 'error') { respond(res, 502, { error: compiled.message }); return; }
      respond(res, 200, { interpretation });
    } catch {
      // Never send raw provider errors, credentials, prompts or billing details to browsers.
      respond(res, 502, { error: 'The interpreter could not finish. Your scene is unchanged. Please retry.' });
    } finally { active--; }
  };
}
