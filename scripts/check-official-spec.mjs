#!/usr/bin/env node
// Compara la ruta que llama cada herramienta con la especificación OFICIAL de GHL
// (src/tools/official-spec-endpoints.json, 543 rutas). Independiente de la cuenta:
// si la ruta no está en la especificación, no existe para nadie (subcuenta ni agencia).
// Uso: npm run build && node scripts/check-official-spec.mjs [nombres separados por coma]
import { readFileSync } from 'node:fs';
process.env.GHL_SHOW_UNVERIFIED_TOOLS = 'true';
process.env.GHL_SHOW_PLANNER_TOOLS = 'true';
const { ToolRegistry } = await import('../dist/tool-registry.js');
const { VERIFIED_BROKEN_TOOLS, INFERRED_BROKEN_TOOLS } = await import('../dist/verified-broken-tools.js');
const spec = JSON.parse(readFileSync(new URL('../src/tools/official-spec-endpoints.json', import.meta.url), 'utf8'));

let ultima = null;
const config = { accessToken: 'x', baseUrl: 'https://x.invalid', version: 'v3', locationId: 'LOC', apiGeneration: 'v3' };
const client = new Proxy({}, {
  get(_t, prop) {
    if (prop === 'then') return undefined;
    if (prop === 'getConfig') return () => config;
    return async (...args) => {
      if (ultima === null && prop === 'makeRequest') ultima = { method: String(args[0]).toUpperCase(), path: String(args[1]).split('?')[0] };
      if (ultima === null && prop !== 'makeRequest') ultima = { method: '?', path: `client.${String(prop)}` };
      return { success: true, data: {} };
    };
  },
});
const registry = new ToolRegistry(client);
const relleno = (s) => s?.type === 'number' || s?.type === 'integer' ? 1 : s?.type === 'boolean' ? true : s?.type === 'array' ? [] : s?.type === 'object' ? {} : 'ID';

const plantillas = spec.map((e) => ({
  e,
  re: new RegExp('^' + e.path.replace(/\/+$/, '').replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\\\{[^}]+\\\}|\{[^}]+\}/g, '[^/]+') + '/?$'),
}));
function enEspec(method, path) {
  const p = path.replace(/\/+$/, '') || '/';
  return plantillas.filter(({ e, re }) => re.test(p) && (method === '?' || e.method === method)).map(({ e }) => e);
}

const pedidas = process.argv[2] ? process.argv[2].split(',') : [...VERIFIED_BROKEN_TOOLS, ...INFERRED_BROKEN_TOOLS];
const filas = [];
for (const nombre of pedidas) {
  const t = registry.getAllToolDefinitions().find((d) => d.name === nombre);
  if (!t) { filas.push([nombre, '—', 'no registrada']); continue; }
  const args = {};
  for (const r of t.inputSchema?.required || []) args[r] = relleno(t.inputSchema.properties?.[r]);
  ultima = null;
  try { await registry.callTool(nombre, args); } catch { /* solo la ruta */ }
  if (!ultima) { filas.push([nombre, '—', 'sin petición']); continue; }
  if (ultima.path.startsWith('client.')) { filas.push([nombre, ultima.path, 'método de cliente (revisar)']); continue; }
  const hits = enEspec(ultima.method, ultima.path);
  filas.push([nombre, `${ultima.method} ${ultima.path}`, hits.length
    ? `EN ESPEC (${hits[0].accessLevel || '?'}; scopes: ${(hits[0].scopes || []).join(',')})`
    : 'NO está en la especificación oficial']);
}
const enEsp = filas.filter((f) => f[2].startsWith('EN ESPEC'));
console.log(`revisadas ${filas.length}: en especificación ${enEsp.length}, fuera ${filas.filter((f) => f[2].startsWith('NO')).length}, otras ${filas.length - enEsp.length - filas.filter((f) => f[2].startsWith('NO')).length}`);
for (const f of filas) console.log(f.join('  |  '));
