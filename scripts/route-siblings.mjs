#!/usr/bin/env node
// Encuentra herramientas "hermanas" de las rutas verificadas como inexistentes:
// llama cada herramienta (incluidas las ocultas) contra un GHL simulado con
// argumentos de relleno, captura la RUTA de la primera petición y marca las que
// comparten prefijo con alguna ruta rota. Solo diagnóstico: no toca GHL real.
// Uso: npm run build && node scripts/route-siblings.mjs
process.env.GHL_SHOW_UNVERIFIED_TOOLS = 'true';
const { ToolRegistry } = await import('../dist/tool-registry.js');
const { VERIFIED_BROKEN_TOOLS } = await import('../dist/verified-broken-tools.js');

let ultima = null;
const config = { accessToken: 'x', baseUrl: 'https://x.invalid', version: 'v3', locationId: 'LOC', apiGeneration: 'v3' };
const client = new Proxy({}, {
  get(_t, prop) {
    if (prop === 'then') return undefined;
    if (prop === 'getConfig') return () => config;
    return async (...args) => {
      if (ultima === null) ultima = prop === 'makeRequest' ? `${args[0]} ${String(args[1]).split('?')[0]}` : `client.${String(prop)}`;
      return { success: true, data: {} };
    };
  },
});
const registry = new ToolRegistry(client);
const relleno = (s) => s?.type === 'number' || s?.type === 'integer' ? 1 : s?.type === 'boolean' ? true : s?.type === 'array' ? [] : s?.type === 'object' ? {} : 'ID';

const rutas = {};
for (const t of registry.getAllToolDefinitions()) {
  const args = {};
  for (const r of t.inputSchema?.required || []) args[r] = relleno(t.inputSchema.properties?.[r]);
  ultima = null;
  try { await registry.callTool(t.name, args); } catch { /* solo interesa la ruta */ }
  rutas[t.name] = ultima;
}
const norm = (r) => (r || '').replace(/^(GET|POST|PUT|PATCH|DELETE) /, '').replace(/\/(ID|LOC)(?=\/|$)/g, '/{}');
const prefijo = (r) => norm(r).split('/').filter(Boolean).slice(0, 2).join('/');
const prefijosRotos = new Set([...VERIFIED_BROKEN_TOOLS].map((n) => rutas[n]).filter((r) => r && !r.startsWith('client.')).map(prefijo));
const hermanas = Object.entries(rutas)
  .filter(([n, r]) => !VERIFIED_BROKEN_TOOLS.has(n) && r && !r.startsWith('client.') && prefijosRotos.has(prefijo(r)))
  .map(([n, r]) => `${n}  ${r}`);
console.log('prefijos rotos:', [...prefijosRotos].sort().join('  '));
console.log(`hermanas (${hermanas.length}):`);
console.log(hermanas.sort().join('\n'));
const sinRuta = [...VERIFIED_BROKEN_TOOLS].filter((n) => !rutas[n] || rutas[n].startsWith('client.'));
console.log('rotas cuya ruta va por método del cliente (revisar a mano):', sinRuta.map((n) => `${n}=${rutas[n]}`).join(' '));
