import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import type { Server } from 'node:http';
import { once } from 'node:events';
import { createHttpApp, resolveBindHost, assertSharedSecretConfigured } from '../scripts/http-security.cjs';

let server: Server;
let base: string;
const SECRET = 'unit-test-shared-secret-0123456789abcdef';
const keys = ['MCP_SHARED_SECRET', 'GHL_MCP_BIND_HOST', 'GHL_MCP_ALLOWED_ORIGINS'];
const saved = keys.map(key => process.env[key]);
beforeAll(async () => {
  keys.forEach(key => delete process.env[key]);
  process.env.MCP_SHARED_SECRET = SECRET;
  const app = createHttpApp();
  app.get('/health', (_req, res) => res.json({status:'healthy'}));
  app.all('/mcp', (_req, res) => res.json({ok:true}));
  app.get('/preview-data', (_req, res) => res.json({ok:true}));
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = `http://127.0.0.1:${(server.address() as any).port}`;
});
afterAll(async () => {
  if (server?.listening) await new Promise<void>(resolve => server.close(() => resolve()));
  keys.forEach((key, i) => { if (saved[i] === undefined) delete process.env[key]; else process.env[key] = saved[i]; });
});
const auth: RequestInit = { headers: { Authorization: `Bearer ${SECRET}` } };
describe('shared production HTTP middleware', () => {
  it.each(['https://evil.example', 'http://localhost.evil.example', 'https://chatgpt.com.evil.example', 'null'])('rejects %s with 403 before auth', async origin => {
    expect((await fetch(base + '/mcp', {...auth, headers:{...auth.headers, Origin:origin}})).status).toBe(403);
  });
  it.each(['http://localhost:3000', 'http://127.0.0.1:3000', 'http://[::1]:3000', 'https://chatgpt.com'])('keeps guard and CORS consistent for %s', async origin => {
    const result = await fetch(base + '/mcp', {...auth, headers:{...auth.headers, Origin:origin}});
    expect(result.status).toBe(200);
    expect(result.headers.get('access-control-allow-origin')).toBe(origin);
  });
  it('applies configured origins and none to the real CORS stack', async () => {
    process.env.GHL_MCP_ALLOWED_ORIGINS = 'https://ops.example.internal';
    const allowed = await fetch(base + '/mcp', {...auth, headers:{...auth.headers, Origin:'https://ops.example.internal'}});
    expect(allowed.status).toBe(200);
    expect(allowed.headers.get('access-control-allow-origin')).toBe('https://ops.example.internal');
    expect((await fetch(base + '/mcp', {...auth, headers:{...auth.headers, Origin:'https://chatgpt.com'}})).status).toBe(403);
    process.env.GHL_MCP_ALLOWED_ORIGINS = 'none';
    expect((await fetch(base + '/mcp', {...auth, headers:{...auth.headers, Origin:'https://ops.example.internal'}})).status).toBe(403);
    expect((await fetch(base + '/mcp', auth)).status).toBe(200);
    delete process.env.GHL_MCP_ALLOWED_ORIGINS;
  });
  it('requires bearer auth for data and allows health and preflight', async () => {
    for (const path of ['/mcp', '/preview-data']) {
      const denied = await fetch(base + path);
      expect(denied.status).toBe(401);
      expect(denied.headers.get('www-authenticate')).toContain('Bearer');
      // Generic 401 body: never says whether the header or the secret failed.
      expect(await denied.json()).toEqual({ error: 'Unauthorized' });
      const wrong = await fetch(base + path, {headers:{Authorization:'Bearer wrong-secret-of-the-same-length!'}});
      expect(wrong.status).toBe(401);
      expect(await wrong.json()).toEqual({ error: 'Unauthorized' });
      expect((await fetch(base + path, auth)).status).toBe(200);
    }
    expect((await fetch(base + '/health')).status).toBe(200);
    expect((await fetch(base + '/health', {method:'POST'})).status).toBe(401);
    const preflight = await fetch(base + '/mcp', {method:'OPTIONS',headers:{Origin:'http://127.0.0.1:3000','Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'authorization,mcp-protocol-version,x-ghl-user-type'}});
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get('access-control-allow-headers')).toContain('x-ghl-user-type');
  });
  it('fails closed on every data route when no secret is configured', async () => {
    delete process.env.MCP_SHARED_SECRET;
    try {
      for (const path of ['/mcp', '/preview-data']) {
        expect((await fetch(base + path)).status).toBe(401);
        expect((await fetch(base + path, auth)).status).toBe(401);
      }
      expect((await fetch(base + '/health')).status).toBe(200);
    } finally {
      process.env.MCP_SHARED_SECRET = SECRET;
    }
  });
  it('refuses to boot without a strong shared secret', () => {
    const previous = process.env.MCP_SHARED_SECRET;
    try {
      delete process.env.MCP_SHARED_SECRET;
      expect(() => assertSharedSecretConfigured()).toThrow(/MCP_SHARED_SECRET is required/);
      process.env.MCP_SHARED_SECRET = 'too-short';
      expect(() => assertSharedSecretConfigured()).toThrow(/at least 32 characters/);
      process.env.MCP_SHARED_SECRET = SECRET;
      expect(() => assertSharedSecretConfigured()).not.toThrow();
    } finally {
      if (previous === undefined) delete process.env.MCP_SHARED_SECRET; else process.env.MCP_SHARED_SECRET = previous;
    }
  });
  it('defaults to loopback and permits an explicit container bind', () => {
    expect(resolveBindHost()).toBe('127.0.0.1');
    process.env.GHL_MCP_BIND_HOST = '   ';
    expect(resolveBindHost()).toBe('127.0.0.1');
    process.env.GHL_MCP_BIND_HOST = '0.0.0.0';
    expect(resolveBindHost()).toBe('0.0.0.0');
  });
});
