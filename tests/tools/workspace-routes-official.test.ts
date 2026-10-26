import { describe, it, expect } from '@jest/globals';
import { readFileSync } from 'fs';
import { join } from 'path';
import { AgentWorkspaceTools } from '../../src/tools/agent-workspace-tools.js';
import { VERIFIED_BROKEN_TOOLS, INFERRED_BROKEN_TOOLS } from '../../src/verified-broken-tools.js';

// Papyrus (26-oct): crm_contact_workspace buscaba con GET /contacts/search y
// GHL respondía 400 (la búsqueda de contactos es POST). El workspace devolvía
// «éxito» con la lectura fallida adentro. Barrido de la clase: TODA lectura de
// TODOS los workspaces debe ser un método+ruta que exista en la spec oficial.

type Ruta = { method: string; path: string };
const oficiales: Ruta[] = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'tools', 'official-route-versions.json'), 'utf8'),
);
const patrones = oficiales.map((r) => ({
  method: r.method.toUpperCase(),
  re: new RegExp('^' + r.path.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\\?\{[^}]+\\?\}/g, '[^/]+') + '/?$'),
}));

function existeEnLaSpec(method: string, url: string): boolean {
  const ruta = url.split('?')[0].replace(/\/$/, '');
  // Una ruta LITERAL de la spec manda sobre las plantillas: «/contacts/search»
  // no es «/contacts/{contactId}» con id «search» (así pasaba el GET inválido).
  const literales = oficiales.filter((r) => !r.path.includes('{') && r.path.replace(/\/$/, '') === ruta);
  if (literales.length) return literales.some((r) => r.method.toUpperCase() === method.toUpperCase());
  return patrones.some((p) => p.method === method.toUpperCase() && p.re.test(ruta));
}

const ARGS: Record<string, unknown> = {
  contactId: 'c1', query: 'Ana', opportunityId: 'o1', pipelineId: 'p1', stageId: 's1',
  calendarId: 'cal1', appointmentId: 'a1', conversationId: 'v1', invoiceId: 'i1',
  orderId: 'ord1', reviewId: 'r1', campaignId: 'camp1', workflowId: 'w1', snapshotId: 'snap1',
  startDate: '2026-10-01', endDate: '2026-10-31', platform: 'facebook', status: 'open',
  limit: 5, focus: 'hoy', tool: 'search_contacts', channel: 'sms', contactIds: ['c1'],
  locationIds: ['loc_123'], email: 'a@x.com',
};

function workspace(apiGeneration: string) {
  const llamadas: Ruta[] = [];
  const client = {
    getConfig: () => ({
      accessToken: 'test', baseUrl: 'https://test.leadconnectorhq.com',
      version: '2021-07-28', locationId: 'loc_123', apiGeneration,
    }),
    makeRequest: async (method: string, path: string) => {
      llamadas.push({ method, path });
      return { success: true, data: {} };
    },
  };
  return { tools: new AgentWorkspaceTools(client as any), llamadas };
}

describe('lecturas de los workspaces contra la spec oficial de GHL', () => {
  for (const generacion of ['v3', 'v2']) {
    it(`cada lectura usa un método+ruta oficial (${generacion})`, async () => {
      const { tools, llamadas } = workspace(generacion);
      // Las ocultas por rotas no se exponen: no cuentan.
      const nombres = tools.getToolDefinitions().map((t: any) => t.name)
        .filter((n: string) => !VERIFIED_BROKEN_TOOLS.has(n) && !INFERRED_BROKEN_TOOLS.has(n));
      expect(nombres.length).toBeGreaterThan(5);
      for (const nombre of nombres) {
        try {
          await tools.handleToolCall(nombre, { ...ARGS });
        } catch {
          // un workspace que exige otra entrada no cuenta: aquí solo se miden las rutas
        }
      }
      expect(llamadas.length).toBeGreaterThan(10);
      const invalidas = [...new Set(llamadas
        .filter((l) => !existeEnLaSpec(l.method, l.path))
        .map((l) => `${l.method} ${l.path.split('?')[0]}`))].sort();
      expect(invalidas).toEqual([]);
    });
  }

  it('la búsqueda de contactos del workspace es POST /contacts/search con la consulta', async () => {
    const llamadas: Array<{ method: string; path: string; body: any }> = [];
    const client = {
      getConfig: () => ({ accessToken: 't', baseUrl: 'https://x', version: '2021-07-28', locationId: 'loc_123', apiGeneration: 'v2' }),
      makeRequest: async (method: string, path: string, body: any) => {
        llamadas.push({ method, path, body });
        return { success: true, data: { contacts: [] } };
      },
    };
    const tools = new AgentWorkspaceTools(client as any);
    await tools.handleToolCall('crm_contact_workspace', { query: 'Ronny Mejia' });
    const busqueda = llamadas.find((l) => l.path.startsWith('/contacts/search'));
    expect(busqueda?.method).toBe('POST');
    expect(busqueda?.body).toMatchObject({ locationId: 'loc_123', query: 'Ronny Mejia' });
  });
});
