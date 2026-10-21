// Bug en vivo 21-oct: «muéstrame la ficha completa de Ronny Mejia con sus
// notas» → Luna llamó search_notes con body: {contactName: "Ronny Mejia"}
// (campo inventado) porque el esquema es un «cuerpo libre» (object con
// additionalProperties: true y sin properties): el modelo adivina.
//
// Este barrido FALLA con cualquier herramienta visible cuyo esquema tenga
// un objeto sin properties (o solo additionalProperties). Rojo primero.
import { ToolRegistry } from '../../src/tool-registry.js';

const config = {
  accessToken: 'x', baseUrl: 'https://x.invalid', version: 'v3',
  locationId: 'LOC', apiGeneration: 'v3',
};
const client = new Proxy({}, {
  get(_t: any, prop: string) {
    if (prop === 'then') return undefined;
    if (prop === 'getConfig') return () => config;
    return async () => ({ success: true, data: {} });
  },
});

function objetosLibres(schema: any, ruta: string[] = []): string[] {
  // Devuelve las rutas de propiedades objeto sin esquema real.
  if (!schema || typeof schema !== 'object') return [];
  const hallazgos: string[] = [];
  const esLibre = (s: any) =>
    s && s.type === 'object' &&
    (!s.properties || Object.keys(s.properties).length === 0) &&
    // Un objeto vacío INTENCIONAL (sinadditionalProperties, sin body libre)
    // solo es libre si acepta cualquier cosa.
    (s.additionalProperties === true || s.additionalProperties === undefined &&
     !s.properties);
  if (esLibre(schema)) hallazgos.push(ruta.join('.') || '(raíz)');
  for (const [clave, valor] of Object.entries(schema.properties || {})) {
    hallazgos.push(...objetosLibres(valor, [...ruta, clave]));
  }
  return hallazgos;
}

describe('barrido: ninguna herramienta visible con cuerpo libre', () => {
  it('falla listando las herramientas con objeto sin properties', () => {
    const registry = new ToolRegistry(client as any);
    const herramientas = registry.getAllToolDefinitions();
    const libres: string[] = [];
    for (const t of herramientas) {
      const rutas = objetosLibres((t as any).inputSchema);
      if (rutas.length > 0) libres.push(`${t.name}: ${rutas.join(', ')}`);
    }
    expect(libres).toEqual([]);
  });
});
