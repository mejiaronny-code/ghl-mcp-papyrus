/**
 * La API de redes sociales entrega los datos dentro de `results`.
 */
import { SocialMediaTools } from '../src/tools/social-media-tools.js';

const cuentas = [{ id: 'a1', name: 'monarchware_official', platform: 'instagram' }];

function con(metodo: string, data: any) {
  return new SocialMediaTools({ [metodo]: async () => ({ success: true, data }) } as any);
}

describe('SocialMediaTools: respuesta envuelta en results', () => {
  it('encuentra las cuentas dentro de results', async () => {
    const r = await con('getSocialAccounts', { success: true, results: { accounts: cuentas, groups: [] } })
      .executeTool('get_social_accounts', {});
    expect(r.accounts).toEqual(cuentas);
    expect(r.message).toContain('1 social media accounts');
  });

  it('también funciona si no viene results', async () => {
    const r = await con('getSocialAccounts', { accounts: cuentas, groups: [] }).executeTool('get_social_accounts', {});
    expect(r.accounts).toEqual(cuentas);
  });

  it('vacío de verdad sigue siendo vacío', async () => {
    const r = await con('getSocialAccounts', { results: { accounts: [], groups: [] } }).executeTool('get_social_accounts', {});
    expect(r.accounts).toEqual([]);
  });

  it('las publicaciones también se leen de results', async () => {
    const posts = [{ _id: 'p1' }];
    const r = await con('searchSocialPosts', { results: { posts, count: 1 } })
      .executeTool('search_social_posts', { type: 'all', accounts: '', skip: '0', limit: '10', fromDate: 'x', toDate: 'y' });
    expect(r.posts).toEqual(posts);
    expect(r.count).toBe(1);
  });

  it('avisa que las publicaciones nativas no aparecen, con o sin resultados, sin campos nuevos', async () => {
    const args = { type: 'all', accounts: '', skip: '0', limit: '10', fromDate: 'x', toDate: 'y' };
    for (const posts of [[], [{ _id: 'p1' }]]) {
      const r = await con('searchSocialPosts', { results: { posts, count: posts.length } })
        .executeTool('search_social_posts', args);
      expect(r.message).toContain('Solo incluye lo creado desde el planificador');
      expect(Object.keys(r).sort()).toEqual(['count', 'message', 'posts', 'success']);
    }
  });
});

describe('SocialMediaTools: estadísticas (6-nov, GHL rechazaba siempre con 422)', () => {
  const ig = { profileId: 'p-ig', name: 'marca_ig', platform: 'instagram', hasStatisticsPermissions: true };
  const fb = { profileId: 'p-fb', name: 'Marca FB', platform: 'facebook', hasStatisticsPermissions: false };
  const borrada = { profileId: 'p-x', name: 'vieja', platform: 'instagram', deleted: true };

  function cliente(accounts: any[]) {
    const llamadas: any[] = [];
    const client = {
      getConfig: () => ({ locationId: 'LOC' }),
      getSocialAccounts: async () => ({ data: { results: { accounts } } }),
      makeRequest: async (metodo: string, ruta: string, body: any) => {
        llamadas.push({ metodo, ruta, body });
        return { data: { results: { totals: { posts: 3 } } } };
      }
    };
    return { tools: new SocialMediaTools(client as any), llamadas };
  }
  const ejecutar = (tools: SocialMediaTools, args: any = {}) => tools.executeTool('get_social_media_statistics', args);

  it('manda solo lo que la API acepta y el locationId va en la ruta', async () => {
    const { tools, llamadas } = cliente([ig]);
    const r = await ejecutar(tools);
    expect(llamadas).toEqual([{ metodo: 'POST', ruta: '/social-media-posting/statistics?locationId=LOC', body: { profileIds: ['p-ig'] } }]);
    expect(r.statistics).toEqual({ totals: { posts: 3 } });
    expect(r.message).toContain('últimos 7 días');
  });

  it('el esquema ya no pide fechas ni obliga a dar cuentas', () => {
    const { tools } = cliente([]);
    const tool = tools.getTools().find((x) => x.name === 'get_social_media_statistics')!;
    expect(Object.keys(tool.inputSchema.properties as object).sort()).toEqual(['platforms', 'profileIds']);
    expect((tool.inputSchema as any).required).toBeUndefined();
  });

  it('deja fuera las borradas y avisa de las que no dan permiso', async () => {
    const { tools, llamadas } = cliente([ig, fb, borrada]);
    const r = await ejecutar(tools);
    expect(llamadas[0].body.profileIds).toEqual(['p-ig']);
    expect(r.message).toContain('Marca FB');
  });

  it('respeta las cuentas y plataformas pedidas', async () => {
    const { tools, llamadas } = cliente([ig, fb]);
    await ejecutar(tools, { profileIds: ['otra'], platforms: ['facebook'] });
    expect(llamadas[0].body).toEqual({ profileIds: ['otra'], platforms: ['facebook'] });
    const segundo = cliente([ig, { ...fb, hasStatisticsPermissions: true }]);
    await ejecutar(segundo.tools, { platforms: ['facebook'] });
    expect(segundo.llamadas[0].body.profileIds).toEqual(['p-fb']);
  });

  it('sin cuentas útiles no llama a GHL y lo dice sin inventar', async () => {
    for (const [cuentas, frase] of [[[], 'No hay cuentas'], [[fb], 'no dan permiso']] as [any[], string][]) {
      const { tools, llamadas } = cliente(cuentas);
      const r = await ejecutar(tools);
      expect(llamadas).toEqual([]);
      expect(r.statistics).toBeNull();
      expect(r.message).toContain(frase);
    }
  });
});
