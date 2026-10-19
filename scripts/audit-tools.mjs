#!/usr/bin/env node
// Auditoría estática (sin credenciales) de TODAS las herramientas registradas.
// Llama cada herramienta con argumentos vacíos contra un cliente GHL simulado
// que registra cada petición, y clasifica el comportamiento:
//   rechaza      → falla con error claro (bien: le faltan datos y lo dice)
//   sin_entrada  → hizo peticiones válidas sin necesitar datos (bien)
//   EXITO_VACIO  → respondió éxito SIN hacer ninguna petición (bug: el agente
//                  lo lee como "no hay datos")
//   URL_ROTA     → hizo peticiones con undefined/null/"" en la ruta o el
//                  cuerpo (bug: GHL responde error o datos de otra cosa)
// Uso: npm run build && node scripts/audit-tools.mjs [salida.json]
import { writeFileSync } from 'node:fs';
import { ToolRegistry } from '../dist/tool-registry.js';

const LOCATION = 'loc_audit';
const calls = [];
const config = {
  accessToken: 'audit', baseUrl: 'https://audit.invalid', version: '2021-07-28',
  locationId: LOCATION, apiGeneration: 'v3',
};

const fakeResponse = { success: true, data: {} };
const client = new Proxy({}, {
  get(_target, prop) {
    if (prop === 'then') return undefined;
    if (prop === 'getConfig') return () => config;
    if (prop === 'updateAccessToken' || prop === 'getCacheStats') return () => ({});
    return async (...args) => {
      calls.push({ method: String(prop), args });
      return fakeResponse;
    };
  },
});

const registry = new ToolRegistry(client);
const tools = registry.allToolDefs.filter((t) => registry.isToolVisible(t.name));

const MALO = /(^|[/=&?])(undefined|null)([/&?]|$)|\/\/|=&|=$/;
function rota(call) {
  return call.args.some((arg) => {
    if (typeof arg === 'string') return MALO.test(arg.replace(/^https?:\/\//, ''));
    if (arg && typeof arg === 'object') {
      const s = JSON.stringify(arg);
      return /:"(undefined|null)"/.test(s);
    }
    return arg === undefined && call.args.length === 1;
  });
}

const resultados = [];
for (const tool of tools) {
  calls.length = 0;
  let estado;
  let detalle = '';
  try {
    const out = await registry.callTool(tool.name, {});
    const texto = JSON.stringify(out ?? null);
    const fallo = out && typeof out === 'object' && (out.success === false || out.isError === true);
    if (fallo) {
      estado = 'rechaza';
      detalle = texto.slice(0, 160);
    } else if (calls.length === 0) {
      estado = 'EXITO_VACIO';
      detalle = texto.slice(0, 160);
    } else if (calls.some(rota)) {
      estado = 'URL_ROTA';
      detalle = JSON.stringify(calls.filter(rota)[0]).slice(0, 200);
    } else {
      estado = 'sin_entrada';
      detalle = calls.map((c) => c.method).join(',').slice(0, 120);
    }
  } catch (err) {
    estado = 'rechaza';
    detalle = String(err?.message || err).slice(0, 160);
  }
  const ro = tool.annotations?.readOnlyHint === true;
  resultados.push({ tool: tool.name, readOnlyHint: ro, estado, detalle });
}

const cuenta = {};
for (const r of resultados) cuenta[r.estado] = (cuenta[r.estado] || 0) + 1;
console.log(`herramientas: ${resultados.length}`);
console.log(JSON.stringify(cuenta));
const salida = process.argv[2] || 'audit-tools.json';
writeFileSync(salida, JSON.stringify(resultados, null, 2));
console.log(`detalle en ${salida}`);
