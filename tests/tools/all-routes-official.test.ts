import { describe, it, expect } from '@jest/globals';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ToolRegistry } from '../../src/tool-registry.js';
import { EnhancedGHLClient } from '../../src/enhanced-ghl-client.js';
import { VERIFIED_LIVE_NOT_IN_SPEC } from '../../src/verified-broken-tools.js';

// Papyrus (26-oct): get_email_reports llamaba GET /reporting/emails, que no
// existe en la API oficial; GHL respondía 401 «not authorized for this scope» y
// parecía un problema de permisos de la llave. Barrido de la clase: TODA
// herramienta visible se llama con el HTTP interceptado (nada sale a GHL) y
// cada método+ruta que usa debe existir en la spec oficial. Las que no, se
// ocultan en NOT_IN_OFFICIAL_SPEC_TOOLS; las que responden en vivo pese a no
// estar en la spec van en VERIFIED_LIVE_NOT_IN_SPEC.

type Ruta = { method: string; path: string };
const oficiales: Ruta[] = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'tools', 'official-route-versions.json'), 'utf8'),
);
const patrones = oficiales.map((r) => ({
  method: r.method.toUpperCase(),
  literal: r.path.includes('{') ? null : r.path.replace(/\/$/, ''),
  re: new RegExp('^' + r.path.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\\?\{[^}]+\\?\}/g, '[^/]+') + '/?$'),
}));

function existeEnLaSpec(method: string, url: string): boolean {
  const ruta = url.split('?')[0].replace(/^https?:\/\/[^/]+/, '').replace(/\/$/, '');
  // Una ruta LITERAL manda sobre las plantillas («/contacts/search» no es
  // «/contacts/{contactId}» con id «search»).
  const literales = patrones.filter((p) => p.literal === ruta);
  if (literales.length) return literales.some((p) => p.method === method.toUpperCase());
  return patrones.some((p) => p.method === method.toUpperCase() && p.re.test(ruta));
}

function valor(schema: any): unknown {
  if (!schema || typeof schema !== 'object') return 'x1';
  if (Array.isArray(schema.enum) && schema.enum.length) return schema.enum[0];
  const tipo = Array.isArray(schema.type) ? schema.type[0] : schema.type;
  if (tipo === 'number' || tipo === 'integer') return 1;
  if (tipo === 'boolean') return true;
  if (tipo === 'array') return [valor(schema.items)];
  if (tipo === 'object') return argumentos(schema);
  return 'x1';
}

function argumentos(schema: any): Record<string, unknown> {
  const salida: Record<string, unknown> = {};
  for (const [k, s] of Object.entries<any>(schema?.properties || {})) {
    if ((schema.required || []).includes(k)) salida[k] = valor(s);
  }
  return salida;
}

async function recorrer(apiGeneration: 'v3' | 'v2') {
  const client = new EnhancedGHLClient({
    accessToken: 'test', baseUrl: 'https://services.leadconnectorhq.com',
    version: '2021-07-28', locationId: 'loc_123', apiGeneration,
  } as any);
  const llamadas = new Map<string, Ruta[]>();
  const rotas: string[] = [];
  let actual = '';
  (client as any).axiosInstance.defaults.adapter = async (config: any) => {
    llamadas.get(actual)!.push({ method: String(config.method).toUpperCase(), path: String(config.url) });
    return { data: {}, status: 200, statusText: 'OK', headers: {}, config };
  };
  const registry = new ToolRegistry(client as any);
  const defs = registry.getAllToolDefinitions();
  for (const def of defs) {
    actual = def.name;
    llamadas.set(def.name, []);
    try {
      await registry.callTool(def.name, argumentos(def.inputSchema));
    } catch (e: any) {
      // Una entrada de prueba que el módulo no acepta no cuenta; una
      // herramienta que NUNCA puede funcionar, sí.
      if (/not yet implemented|Unknown tool/i.test(String(e?.message || e))) rotas.push(def.name);
    }
  }
  return { nombres: defs.map((d) => d.name), llamadas, rotas };
}

describe('todas las herramientas visibles contra la spec oficial de GHL', () => {
  for (const generacion of ['v3', 'v2'] as const) {
    it(`cada llamada usa un método+ruta oficial (${generacion})`, async () => {
      const { nombres, llamadas, rotas } = await recorrer(generacion);
      expect(nombres.length).toBeGreaterThan(300);
      expect([...llamadas.values()].flat().length).toBeGreaterThan(300);
      const invalidas = [...llamadas.entries()]
        .filter(([nombre]) => !VERIFIED_LIVE_NOT_IN_SPEC.has(nombre))
        .flatMap(([nombre, rs]) => rs
          .filter((r) => !existeEnLaSpec(r.method, r.path))
          .map((r) => `${nombre}: ${r.method} ${r.path.split('?')[0]}`));
      expect([...new Set(invalidas)].sort()).toEqual([]);
      expect(rotas.sort()).toEqual([]);
    }, 180000);
  }

  it('los reportes de correo inventados ya no están a la vista', async () => {
    const { nombres } = await recorrer('v3');
    expect(nombres).not.toContain('get_email_reports');
    expect(nombres).toContain('official_calendars_delete_event');
  }, 180000);
});
