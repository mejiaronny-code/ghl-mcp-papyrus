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
