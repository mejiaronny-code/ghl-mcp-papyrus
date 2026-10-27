import { describe, it, expect } from '@jest/globals';
import { GHLApiClient } from '../../src/clients/ghl-api-client.js';

// Papyrus (26-oct, en vivo): search_contacts con email o phone respondía 400
// «value?.map is not a function» porque `filters` iba como objeto. GHL espera
// una LISTA de {field, operator, value} (verificado contra la API real).

function cliente() {
  const client = new GHLApiClient({
    accessToken: 't', baseUrl: 'https://services.leadconnectorhq.com',
    version: '2021-07-28', locationId: 'loc_1',
  } as any);
  const cuerpos: any[] = [];
  (client as any).axiosInstance.defaults.adapter = async (config: any) => {
    cuerpos.push(JSON.parse(config.data || '{}'));
    return { data: { contacts: [], total: 0 }, status: 200, statusText: 'OK', headers: {}, config };
  };
  return { client, cuerpos };
}

describe('searchContacts arma filters como lista', () => {
  it.each([
    [{ email: ' correo@prueba.com ' }, [{ field: 'email', operator: 'eq', value: 'correo@prueba.com' }]],
    [{ phone: '+50488715634' }, [{ field: 'phone', operator: 'eq', value: '+50488715634' }]],
    [{ tags: ['vip', 'prueba'] }, [{ field: 'tags', operator: 'contains', value: ['vip', 'prueba'] }]],
    [{ email: 'a@x.com', tags: ['vip'] }, [
      { field: 'email', operator: 'eq', value: 'a@x.com' },
      { field: 'tags', operator: 'contains', value: ['vip'] }]],
  ])('%j', async (filtros, esperado) => {
    const { client, cuerpos } = cliente();
    await client.searchContacts({ locationId: 'loc_1', filters: filtros } as any);
    expect(Array.isArray(cuerpos[0].filters)).toBe(true);
    expect(cuerpos[0].filters).toEqual(esperado);
  });

  it.each([[{}], [{ email: '  ' }], [{ tags: [] }]])('sin filtros útiles no manda filters (%j)', async (filtros) => {
    const { client, cuerpos } = cliente();
    await client.searchContacts({ locationId: 'loc_1', query: 'Ronny', filters: filtros } as any);
    expect(cuerpos[0].filters).toBeUndefined();
    expect(cuerpos[0].query).toBe('Ronny');
  });
});
