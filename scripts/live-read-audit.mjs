#!/usr/bin/env node
// Pasada 2 de la auditoría: llama TODAS las herramientas de SOLO LECTURA contra
// la cuenta real de GHL y clasifica el resultado de cada una. Nunca llama una
// herramienta cuyo nombre sugiera escritura (doble filtro: verbo + anotación).
// No guarda datos del CRM: solo el estado de cada herramienta y el mensaje de
// error (sin el token).
//
// Uso (PowerShell):
//   $env:GHL_API_KEY="pit-..."; $env:GHL_LOCATION_ID="..."; npm run build; node scripts/live-read-audit.mjs
// Salida: live-read-audit.json + resumen en consola.
import { writeFileSync } from 'node:fs';
import { ToolRegistry } from '../dist/tool-registry.js';
import { EnhancedGHLClient } from '../dist/enhanced-ghl-client.js';

const token = (process.env.GHL_API_KEY || '').trim();
const locationId = (process.env.GHL_LOCATION_ID || '').trim();
if (!token || !locationId) {
  console.error('Faltan GHL_API_KEY y GHL_LOCATION_ID.');
  process.exit(1);
}

const client = new EnhancedGHLClient({
  accessToken: token,
  baseUrl: process.env.GHL_BASE_URL || 'https://services.leadconnectorhq.com',
  version: process.env.GHL_API_VERSION || '2021-07-28',
  locationId,
  apiGeneration: process.env.GHL_API_GENERATION === 'v2' ? 'v2' : 'v3',
});
const registry = new ToolRegistry(client);

// ── Filtro de seguridad: solo lectura ─────────────────────────────────────
const VERBOS_LECTURA = new Set(['get', 'list', 'search', 'find', 'fetch', 'lookup', 'count', 'view', 'read', 'check', 'query', 'describe', 'retrieve', 'show']);
const LECTORAS_CURADAS = new Set([
  'crm_contact_workspace', 'crm_location_overview', 'crm_daily_briefing', 'crm_search_everything',
  'crm_find_unworked_leads', 'crm_conversation_workspace', 'crm_pipeline_workspace',
  'crm_appointment_workspace', 'crm_automation_workspace', 'crm_reputation_workspace',
  'crm_billing_workspace', 'crm_agency_admin_workspace',
]);
const PALABRAS_PROHIBIDAS = /(^|_)(send|create|update|delete|remove|add|cancel|book|pay|charge|refund|publish|trigger|enroll|start|stop|pause|resume|import|upload|post|reply|set|toggle|mark|assign|merge|bulk|run|execute|generate|purchase|release|void|approve|reject|archive|restore|move|copy|clone|duplicate|schedule|invite|connect|disconnect|verify|transfer|upsert|patch|put|edit|record|issue|finalize|submit|test)(_|$)/;

function esLectura(tool) {
  const name = tool.name;
  if (LECTORAS_CURADAS.has(name)) return true;
  if (name.startsWith('crm_')) return false;
  if (tool.annotations?.destructiveHint === true) return false;
  if (tool.annotations?.readOnlyHint === false) return false;
  // El verbo puede no ser la primera palabra (official_calendars_get_events):
  // se toma el PRIMER token que sea verbo, de lectura o de escritura.
  const tokens = name.split('_');
  const i = tokens.findIndex((t) => VERBOS_LECTURA.has(t) || PALABRAS_PROHIBIDAS.test(t));
  if (i < 0 || !VERBOS_LECTURA.has(tokens[i])) return false;
  return !PALABRAS_PROHIBIDAS.test(tokens.slice(i + 1).join('_'));
}

// ── IDs reales cosechados de las respuestas ───────────────────────────────
const ids = { locationId };
function cosechar(valor, clave = '') {
  if (Array.isArray(valor)) {
    const singular = clave.replace(/ies$/, 'y').replace(/s$/, '');
    for (const item of valor.slice(0, 1)) {
      if (item && typeof item === 'object' && typeof item.id === 'string' && singular) {
        const k = `${singular}Id`;
        if (!ids[k]) ids[k] = item.id;
      }
      cosechar(item, singular);
    }
    return;
  }
  if (!valor || typeof valor !== 'object') return;
  for (const [k, v] of Object.entries(valor)) {
    if (/Id$/.test(k) && typeof v === 'string' && v && !ids[k]) ids[k] = v;
    if (k === 'id' && typeof v === 'string' && clave && !ids[`${clave}Id`]) ids[`${clave}Id`] = v;
    if (v && typeof v === 'object') cosechar(v, k);
  }
}

const hoy = new Date();
const hace30 = new Date(hoy.getTime() - 30 * 86400000);
function valorPara(nombre, esquema) {
  if (ids[nombre]) return ids[nombre];
  const n = nombre.toLowerCase();
  if (/^(start|from)(date|time)?$|startdate|starttime|fromdate/.test(n)) return esquema?.type === 'number' ? hace30.getTime() : hace30.toISOString().slice(0, 10);
  if (/^(end|to)(date|time)?$|enddate|endtime|todate/.test(n)) return esquema?.type === 'number' ? hoy.getTime() : hoy.toISOString().slice(0, 10);
  if (n === 'limit' || n === 'pagelimit') return 1;
  return undefined;
}

function clasificar(err) {
  const m = /GHL API Error \((\d+)\)/.exec(err) || /\b(4\d\d|5\d\d)\b/.exec(err);
  const http = m ? Number(m[1]) : null;
  if (http === 401 || http === 403 || /scope|not authorized|unauthorized|forbidden/i.test(err)) return ['permiso', http];
  if (http === 404) return ['no_encontrado', http];
  if (http === 400 || http === 422) return ['validacion', http];
  if (http === 429) return ['limite', http];
  if (http && http >= 500) return ['error_ghl', http];
  if (/Invalid arguments|required/i.test(err)) return ['validacion_local', null];
  return ['error_servidor_mcp', http];
}
const limpiar = (s) => String(s).split(token).join('[token]').slice(0, 220);
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

async function llamar(tool, args) {
  for (let intento = 0; intento < 2; intento++) {
    try {
      const out = await registry.callTool(tool.name, args);
      const fallo = out && typeof out === 'object' && (out.success === false || out.isError === true);
      if (!fallo) {
        cosechar(out);
        return { estado: 'ok' };
      }
      const msg = limpiar(out.error?.message || out.error || JSON.stringify(out).slice(0, 220));
      const [estado, http] = clasificar(msg);
      if (estado === 'limite' && intento === 0) { await pausa(10000); continue; }
      return { estado, http, mensaje: msg };
    } catch (e) {
      const msg = limpiar(e?.message || e);
      const [estado, http] = clasificar(msg);
      if (estado === 'limite' && intento === 0) { await pausa(10000); continue; }
      return { estado, http, mensaje: msg };
    }
  }
  return { estado: 'limite' };
}

const todas = registry.getAllToolDefinitions();
const lectura = todas.filter(esLectura);
console.log(`herramientas visibles: ${todas.length}; de lectura a probar: ${lectura.length}`);
if (process.env.DRY_RUN === '1') {
  // Solo lista lo que se llamaría (para revisar el filtro sin tocar GHL).
  writeFileSync('live-read-audit.dry.txt', lectura.map((t) => t.name).sort().join('\n'));
  console.log('modo prueba: lista en live-read-audit.dry.txt, no se llamó nada');
  process.exit(0);
}

const requeridos = (t) => t.inputSchema?.required || [];
const sinRequeridos = lectura.filter((t) => requeridos(t).length === 0);
const conRequeridos = lectura.filter((t) => requeridos(t).length > 0);
const resultados = [];

for (const ronda of [sinRequeridos, conRequeridos]) {
  for (const tool of ronda) {
    const args = {};
    const faltan = [];
    for (const nombre of requeridos(tool)) {
      const v = valorPara(nombre, tool.inputSchema?.properties?.[nombre]);
      if (v === undefined) faltan.push(nombre); else args[nombre] = v;
    }
    let r;
    if (faltan.length) r = { estado: 'sin_probar', mensaje: `sin ID real para: ${faltan.join(', ')}` };
    else r = await llamar(tool, args);
    resultados.push({ tool: tool.name, ...r });
    process.stdout.write(r.estado === 'ok' ? '.' : r.estado[0]);
    await pausa(150);
  }
}

const cuenta = {};
for (const r of resultados) cuenta[r.estado] = (cuenta[r.estado] || 0) + 1;
console.log(`\n${JSON.stringify(cuenta)}`);
console.log(`IDs reales encontrados para: ${Object.keys(ids).join(', ')}`);
writeFileSync('live-read-audit.json', JSON.stringify({ fecha: new Date().toISOString(), cuenta, resultados }, null, 2));
console.log('detalle en live-read-audit.json (sin datos del CRM ni el token)');
