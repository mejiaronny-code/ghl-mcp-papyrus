import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { createServer, type Server } from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { join } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';

const root = join(__dirname, '..');
const SECRET = 'transport-test-shared-secret-9012345678';
let provider: Server;
let providerUrl: string;
beforeAll(async () => {
  provider = createServer((_req, res) => { res.setHeader('Content-Type','application/json'); res.end('{"location":{"id":"test-location"}}'); });
  provider.listen(0, '127.0.0.1');
  await once(provider, 'listening');
  providerUrl = `http://127.0.0.1:${(provider.address() as any).port}`;
});
afterAll(async () => { if (provider?.listening) await new Promise<void>(resolve => provider.close(() => resolve())); });
async function freePort() {
  const server = createServer(); server.listen(0, '127.0.0.1');
  await once(server, 'listening'); const port = (server.address() as any).port;
  await new Promise<void>(resolve => server.close(() => resolve())); return port;
}
async function smoke(file: string, dataPath: string, bindHost?: string) {
  const port = await freePort();
  const child = spawn(process.execPath, [join(root,file)], {cwd:root, env:{
    PATH:process.env.PATH, GHL_API_KEY:'test-token', GHL_LOCATION_ID:'test-location', GHL_BASE_URL:providerUrl,
    PORT:String(port), GHL_MCP_APPS_PORT:String(port), GHL_TOOL_PROFILE:'curated', GHL_API_GENERATION:'v3',
    ALLOW_BASE_ACCOUNT:'true', MCP_SHARED_SECRET:SECRET, GHL_MCP_ALLOWED_ORIGINS:'https://ops.example.internal',
    ...(bindHost ? {GHL_MCP_BIND_HOST:bindHost} : {}),
  },stdio:['ignore','pipe','pipe']});
  let output = ''; child.stdout.on('data', chunk => output += chunk); child.stderr.on('data', chunk => output += chunk);
  const base = `http://127.0.0.1:${port}`;
  try {
    let ready = false;
    for (let i=0;i<100;i++) {
      if (child.exitCode !== null) throw new Error(output);
      try { ready = (await fetch(base+'/health')).status === 200; } catch {}
      if (ready) break;
      await new Promise(resolve => setTimeout(resolve,50));
    }
    if (!ready) throw new Error('Server did not start: '+output);
    expect(output).toContain(`bind=${bindHost || '127.0.0.1'}:${port}`);
    expect((await fetch(base+dataPath)).status).toBe(401);
    expect((await fetch(base+dataPath,{headers:{Origin:'https://evil.example',Authorization:`Bearer ${SECRET}`}})).status).toBe(403);
    const result = await fetch(base+dataPath,{headers:{Origin:'https://ops.example.internal',Authorization:`Bearer ${SECRET}`}});
    expect(result.status).toBe(200);
    expect(result.headers.get('access-control-allow-origin')).toBe('https://ops.example.internal');
    if (file === 'dist/main.js' || file === 'mcp-apps/dist/main.js') {
      const init = await fetch(base+'/mcp', {method:'POST', headers:{Authorization:`Bearer ${SECRET}`,'Content-Type':'application/json',Accept:'application/json, text/event-stream'}, body:JSON.stringify({jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2025-11-25',capabilities:{},clientInfo:{name:'test',version:'1'}}})});
      expect(init.status).toBe(200);
      expect(await init.text()).toContain('serverInfo');
    }
  } finally {
    if (child.exitCode === null) { const exited=once(child,'exit'); child.kill('SIGTERM'); await exited; }
  }
}
describe('shipped HTTP transport security', () => {
  it('protects the primary server and accepts authenticated MCP initialization', () => smoke('dist/main.js','/tools'));
  it('protects the legacy server', () => smoke('dist/http-server.js','/tools'));
  it('supports the explicit container interface', () => smoke('dist/main.js','/tools','0.0.0.0'));
  // Apps are optional locally; CI builds them before running this suite.
  (existsSync(join(root,'mcp-apps/dist/main.js')) ? it : it.skip)('protects Apps preview and MCP', () => smoke('mcp-apps/dist/main.js','/preview'));
  it('keeps Compose host publication local while binding all container interfaces', () => {
    const compose = readFileSync(join(root,'docker-compose.yml'),'utf8');
    expect(compose).toContain('127.0.0.1:8000:8000');
    expect(compose).toContain('GHL_MCP_BIND_HOST: "0.0.0.0"');
    expect(readFileSync(join(root,'Dockerfile'),'utf8')).toContain('ENV GHL_MCP_BIND_HOST=0.0.0.0');
  });
});
