import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { ToolRegistry } from '../src/tool-registry.js';

const mockClient = {
  getConfig: () => ({
    accessToken: 'test',
    baseUrl: 'https://test.leadconnectorhq.com',
    version: '2021-07-28',
    locationId: 'test_location_123',
  }),
  makeRequest: async () => ({ success: true, data: {} }),
};

describe('ToolRegistry profiles', () => {
  const previousProfile = process.env.GHL_TOOL_PROFILE;
  const previousGeneration = process.env.GHL_API_GENERATION;

  beforeEach(() => {
    delete process.env.GHL_TOOL_PROFILE;
    delete process.env.GHL_API_GENERATION;
    // These tests cover the upstream surface, planner tools included.
    process.env.GHL_SHOW_PLANNER_TOOLS = 'true';
  });

  afterEach(() => {
    delete process.env.GHL_SHOW_PLANNER_TOOLS;
    if (previousProfile === undefined) {
      delete process.env.GHL_TOOL_PROFILE;
    } else {
      process.env.GHL_TOOL_PROFILE = previousProfile;
    }
    if (previousGeneration === undefined) {
      delete process.env.GHL_API_GENERATION;
    } else {
      process.env.GHL_API_GENERATION = previousGeneration;
    }
  });

  it('Papyrus default hides planner-only tools and the handler-less CSV tool', () => {
    delete process.env.GHL_SHOW_PLANNER_TOOLS;
    const names = new ToolRegistry(mockClient as any).getAllToolNames();
    expect(names).toContain('crm_contact_workspace');
    expect(names).toContain('search_contacts');
    expect(names).not.toContain('crm_prepare_lead_intake');
    expect(names).not.toContain('crm_location_health_check');
    expect(names).not.toContain('crm_get_next_page');
    expect(names).not.toContain('get_csv_upload_status');
  });

  it('defaults to full profile with raw and curated tools', () => {
    const registry = new ToolRegistry(mockClient as any);

    expect(registry.getToolProfile()).toBe('full');
    expect(registry.getAllToolNames()).toContain('search_contacts');
    expect(registry.getAllToolNames()).toContain('crm_prepare_lead_intake');
    expect(registry.getToolCount()).toBe(registry.getAllToolDefinitions().length);
  });

  it('keeps every visible tool name unique across generations and profiles', () => {
    const generations = ['v3', 'v2'] as const;
    const profiles = ['full', 'raw', 'stable', 'official', 'curated'] as const;

    for (const generation of generations) {
      for (const profile of profiles) {
        process.env.GHL_TOOL_PROFILE = profile;
        const registry = new ToolRegistry({
          ...mockClient,
          getConfig: () => ({ ...mockClient.getConfig(), apiGeneration: generation }),
        } as any);
        const names = registry.getAllToolNames();
        const duplicateNames = names.filter((name, index) => names.indexOf(name) !== index);

        expect({ generation, profile, duplicateNames }).toEqual({
          generation,
          profile,
          duplicateNames: [],
        });
      }
    }
  });

  it.each([
    ['v3', 'full'],
    ['v3', 'raw'],
    ['v2', 'full'],
    ['v2', 'raw'],
  ] as const)(
    'keeps the internal workflow builder unregistered and dispatches the public workflow module in %s/%s mode',
    async (generation, profile) => {
      process.env.GHL_TOOL_PROFILE = profile;
      const registry = new ToolRegistry({
        ...mockClient,
        getConfig: () => ({ ...mockClient.getConfig(), apiGeneration: generation }),
      } as any);
      const modules = (registry as any).modules as Array<{
        name: string;
        executeTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
      }>;
      const publicModule = modules.find((module) => module.name === 'workflows');
      const calls: string[] = [];

      expect(publicModule).toBeDefined();
      expect(modules.find((module) => module.name === 'workflowBuilder')).toBeUndefined();
      publicModule!.executeTool = async (name) => {
        calls.push(`public:${name}`);
        return { module: 'public' };
      };

      await expect(registry.callTool('ghl_get_workflows', {}))
        .resolves.toEqual({ module: 'public' });
      expect(calls).toEqual(['public:ghl_get_workflows']);

      const inventoryByTool = new Map(registry.getToolInventory().map((tool) => [tool.name, tool]));
      expect(inventoryByTool.get('ghl_get_workflows')).toMatchObject({ module: 'workflows' });
      // 26-oct: DELETE /workflows/{id} no existe en la API oficial (solo GET
      // /workflows/): oculta en NOT_IN_OFFICIAL_SPEC_TOOLS.
      expect(inventoryByTool.has('ghl_delete_workflow')).toBe(false);
      // The private internal workflow-builder surface must not be exposed.
      for (const name of ['ghl_delete_workflow_internal', 'ghl_create_workflow', 'ghl_list_workflows_full', 'ghl_get_workflow_full', 'ghl_update_workflow_actions', 'ghl_publish_workflow', 'ghl_clone_workflow']) {
        expect(inventoryByTool.has(name)).toBe(false);
      }
      await expect(registry.callTool('ghl_delete_workflow_internal', { workflowId: 'internal-id' })).resolves.toBeUndefined();
    }
  );

  it('can expose only curated agent workspace tools', async () => {
    process.env.GHL_TOOL_PROFILE = 'curated';
    const registry = new ToolRegistry(mockClient as any);
    const names = registry.getAllToolNames();

    expect(registry.getToolProfile()).toBe('curated');
    expect(names).toContain('crm_prepare_lead_intake');
    expect(names).toContain('crm_prepare_appointment_booking');
    expect(names).not.toContain('crm_workflow_automation_options');
    expect(names).not.toContain('search_contacts');
    expect(await registry.callTool('search_contacts', {})).toBeUndefined();
    expect(await registry.callTool('crm_list_workspaces', {})).toBeDefined();
  });

  it('exposes advanced curated overview, search, briefing, action, pagination, and prepare tools', async () => {
    process.env.GHL_TOOL_PROFILE = 'curated';
    const registry = new ToolRegistry(mockClient as any);
    const names = registry.getAllToolNames();

    expect(names).toEqual(expect.arrayContaining([
      'crm_location_overview',
      'crm_daily_briefing',
      'crm_next_best_actions',
      'crm_search_everything',
      'crm_get_next_page',
      'crm_prepare_contact_followup',
      'crm_prepare_lead_reactivation',
      'crm_prepare_missed_call_response',
      'crm_prepare_pipeline_cleanup',
      'crm_prepare_review_request_batch',
      'crm_prepare_invoice_followup',
    ]));

    const overview = await registry.callTool('crm_location_overview', {});
    expect(overview).toMatchObject({
      workflow: expect.objectContaining({ name: 'crm_location_overview' }),
      resultSummary: expect.objectContaining({ readResults: expect.any(Number) }),
    });

    const followup = await registry.callTool('crm_prepare_contact_followup', {
      contactId: 'contact-123',
      message: 'Checking in',
      taskTitle: 'Follow up',
    });
    expect(followup).toMatchObject({
      confirmationRequired: true,
      resultSummary: expect.objectContaining({ writeActions: expect.any(Number) }),
    });
    expect((followup as any).executeToolCalls.map((call: any) => call.tool)).toEqual(expect.arrayContaining(['send_sms', 'create_contact_task']));

    const nextBest = await registry.callTool('crm_next_best_actions', {
      contactId: 'contact-123',
      opportunityId: 'opp-123',
      intent: 'Book appointment',
    });
    expect(nextBest).toMatchObject({
      confirmationRequired: true,
      resultSummary: expect.objectContaining({ writeActions: expect.any(Number) }),
    });
    expect((nextBest as any).executeToolCalls.map((call: any) => call.tool)).toEqual(
      expect.arrayContaining(['create_contact_task', 'create_contact_note'])
    );

    const reviewBatch = await registry.callTool('crm_prepare_review_request_batch', {
      contactIds: ['contact-1', 'contact-2'],
      message: 'Would you mind leaving us a review?',
    });
    expect(reviewBatch).toMatchObject({
      confirmationRequired: true,
      resultSummary: expect.objectContaining({ writeActions: 2 }),
    });
    expect((reviewBatch as any).executeToolCalls.map((call: any) => call.tool)).toEqual([
      'send_review_request',
      'send_review_request',
    ]);

    expect(await registry.callTool('crm_workflow_automation_options', {})).toBeUndefined();
  });

  it('can expose only raw endpoint-level tools', () => {
    process.env.GHL_TOOL_PROFILE = 'raw';
    const registry = new ToolRegistry(mockClient as any);
    const names = registry.getAllToolNames();

    expect(registry.getToolProfile()).toBe('raw');
    expect(names).toContain('search_contacts');
    expect(names).not.toContain('crm_prepare_lead_intake');
  });

  it('can expose only explicit official and live-docs supplemental tools', () => {
    process.env.GHL_TOOL_PROFILE = 'official';
    const registry = new ToolRegistry(mockClient as any);
    const inventory = registry.getToolInventory();
    const names = inventory.map((tool) => tool.name);

    expect(registry.getToolProfile()).toBe('official');
    expect(names).toContain('official_ad_publishing_fb_get_reporting');
    // In v3 mode the deprecated Email Campaign V2 tools are hidden (superseded
    // by the v3 /emails/locations/{locationId}/... suite). A current v3 email
    // tool should be visible instead.
    expect(names).not.toContain('create_email_campaign_v2');
    expect(names.some((n) => n.startsWith('official_emails_'))).toBe(true);
    expect(names).not.toContain('search_contacts');
    expect(inventory.every((tool) => ['official', 'live-docs-supplemental'].includes(tool.stability))).toBe(true);
  });

  it('can expose stable tools while hiding deprecated and private/unstable surfaces', () => {
    process.env.GHL_TOOL_PROFILE = 'stable';
    const registry = new ToolRegistry(mockClient as any);
    const inventory = registry.getToolInventory();
    const names = inventory.map((tool) => tool.name);

    expect(registry.getToolProfile()).toBe('stable');
    expect(names).toContain('search_contacts');
    expect(names).toContain('official_ad_publishing_fb_get_reporting');
    expect(names).toContain('crm_prepare_lead_intake');
    expect(inventory.some((tool) => tool.stability === 'deprecated')).toBe(false);
    expect(inventory.some((tool) => tool.stability === 'private-or-unstable')).toBe(false);
  });
});
