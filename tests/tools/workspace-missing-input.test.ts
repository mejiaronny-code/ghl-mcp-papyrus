import { describe, it, expect } from '@jest/globals';
import { AgentWorkspaceTools } from '../../src/tools/agent-workspace-tools.js';

// Papyrus (19-oct): "¿Cuántos contactos tengo?" picked crm_contact_workspace
// with no contactId/query; every read step was skipped and the empty success
// was read by the agent as "no contacts". It must fail loudly instead.
function workspace() {
  const calls: string[] = [];
  const client = {
    getConfig: () => ({
      accessToken: 'test',
      baseUrl: 'https://test.leadconnectorhq.com',
      version: '2021-07-28',
      locationId: 'loc_123',
      apiGeneration: 'v3',
    }),
    makeRequest: async (_method: string, path: string) => {
      calls.push(path);
      return { success: true, data: { contacts: [{ id: 'c1' }] } };
    },
  };
  return { tools: new AgentWorkspaceTools(client as any), calls };
}

describe('workspace tools without usable input', () => {
  it('crm_contact_workspace without contactId or query fails instead of returning empty', async () => {
    const { tools, calls } = workspace();
    await expect(tools.handleToolCall('crm_contact_workspace', {})).rejects.toThrow(
      /crm_contact_workspace needs at least one of: contactId, query/,
    );
    expect(calls).toEqual([]);
  });

  it('crm_contact_workspace with a query still reads', async () => {
    const { tools, calls } = workspace();
    const result: any = await tools.handleToolCall('crm_contact_workspace', { query: 'Ana' });
    expect(calls.length).toBeGreaterThan(0);
    expect(result.readResults.length).toBeGreaterThan(0);
  });

  it('crm_location_overview needs no input and still reads', async () => {
    const { tools, calls } = workspace();
    await tools.handleToolCall('crm_location_overview', {});
    expect(calls.length).toBeGreaterThan(0);
  });
});
