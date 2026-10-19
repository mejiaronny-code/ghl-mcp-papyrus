/**
 * GoHighLevel Agent Studio Tools
 * Implements the Agent Studio API (launched March 13 2026)
 * Allows programmatic creation and management of AI agents, their graph-based
 * versions (nodes/edges), and deployment from staging → production.
 *
 * Required OAuth scope: agent-studio_write
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { GHLApiClient } from '../clients/ghl-api-client.js';

export class AgentStudioTools {
  constructor(private ghlClient: GHLApiClient) {}

  getToolDefinitions(): Tool[] {
    return [
      // ─── Agent CRUD ──────────────────────────────────────────────────────────
      {
        name: 'ghl_create_agent',
        description:
          'Create a new AI agent in GoHighLevel Agent Studio. ' +
          'A staging version is automatically created. ' +
          'Scope required: agent-studio_write.',
        inputSchema: {
          type: 'object',
          properties: {
            locationId: {
              type: 'string',
              description: 'Location ID to create the agent in (uses default if not provided)',
            },
            name: {
              type: 'string',
              description: 'Display name for the agent',
            },
            description: {
              type: 'string',
              description: 'Optional description of what the agent does',
            },
            status: {
              type: 'string',
              enum: ['active', 'inactive', 'draft'],
              description: 'Initial status of the agent (default: draft)',
            },
          },
          required: ['name'],
        },
        _meta: {
          labels: { category: 'agent-studio', access: 'write', complexity: 'simple' },
        },
      },
      {
        name: 'ghl_list_agents',
        description:
          'List all AI agents in a GoHighLevel location. ' +
          'Returns agent metadata including IDs, names, statuses and version counts.',
        inputSchema: {
          type: 'object',
          properties: {
            locationId: {
              type: 'string',
              description: 'Location ID to list agents for (uses default if not provided)',
            },
            status: {
              type: 'string',
              enum: ['active', 'inactive', 'draft'],
              description: 'Filter agents by status',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of agents to return (default: 20)',
            },
            skip: {
              type: 'number',
              description: 'Number of agents to skip for pagination (default: 0)',
            },
          },
        },
        _meta: {
          labels: { category: 'agent-studio', access: 'read', complexity: 'simple' },
        },
      },
      {
        name: 'ghl_get_agent',
        description: 'Get details for a specific AI agent by ID, including its current staging and production versions.',
        inputSchema: {
          type: 'object',
          properties: {
            agentId: {
              type: 'string',
              description: 'The unique ID of the agent to retrieve',
            },
            locationId: {
              type: 'string',
              description: 'Location ID (uses default if not provided)',
            },
          },
          required: ['agentId'],
        },
        _meta: {
          labels: { category: 'agent-studio', access: 'read', complexity: 'simple' },
        },
      },
      {
        name: 'ghl_update_agent',
        description:
          'Update agent metadata (name, description, status). ' +
          'To modify the agent graph (nodes/edges) use ghl_update_agent_version instead.',
        inputSchema: {
          type: 'object',
          properties: {
            agentId: {
              type: 'string',
              description: 'The unique ID of the agent to update',
            },
            locationId: {
              type: 'string',
              description: 'Location ID (uses default if not provided)',
            },
            name: {
              type: 'string',
              description: 'New display name for the agent',
            },
            description: {
              type: 'string',
              description: 'New description for the agent',
            },
            status: {
              type: 'string',
              enum: ['active', 'inactive', 'draft'],
              description: 'New status for the agent',
            },
          },
          required: ['agentId'],
        },
        _meta: {
          labels: { category: 'agent-studio', access: 'write', complexity: 'simple' },
        },
      },
      {
        name: 'ghl_delete_agent',
        description:
          'Permanently delete an AI agent and all its versions. This action is irreversible.',
        inputSchema: {
          type: 'object',
          properties: {
            agentId: {
              type: 'string',
              description: 'The unique ID of the agent to delete',
            },
            locationId: {
              type: 'string',
              description: 'Location ID (uses default if not provided)',
            },
          },
          required: ['agentId'],
        },
        _meta: {
          labels: { category: 'agent-studio', access: 'delete', complexity: 'simple' },
        },
      },

      // ─── Version Management ───────────────────────────────────────────────────
      {
        name: 'ghl_list_agent_versions',
        description:
          'List all versions (staging and production snapshots) for a given agent.',
        inputSchema: {
          type: 'object',
          properties: {
            agentId: {
              type: 'string',
              description: 'The unique ID of the agent',
            },
            locationId: {
              type: 'string',
              description: 'Location ID (uses default if not provided)',
            },
          },
          required: ['agentId'],
        },
        _meta: {
          labels: { category: 'agent-studio', access: 'read', complexity: 'simple' },
        },
      },
      {
        name: 'ghl_update_agent_version',
        description:
          'Update the agent graph for a specific version. ' +
          'This is the primary tool for building an agent programmatically — supply nodes (steps/actions), ' +
          'edges (transitions between nodes), variables (context data), and config (global settings). ' +
          'Typically called on the staging version before deploying.',
        inputSchema: {
          type: 'object',
          properties: {
            versionId: {
              type: 'string',
              description: 'The version ID to update (usually the staging version ID)',
            },
            locationId: {
              type: 'string',
              description: 'Location ID (uses default if not provided)',
            },
            nodes: {
              type: 'array',
              description:
                'Array of node objects defining each step/action in the agent. ' +
                'Each node has: id (string), type (string), data (object with node-specific config)',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', description: 'Unique node identifier' },
                  type: {
                    type: 'string',
                    description:
                      'Node type (e.g., trigger, sendMessage, condition, aiDecision, webhook, delay, endConversation)',
                  },
                  data: {
                    type: 'object',
                    description: 'Node-specific configuration data',
                  },
                },
                required: ['id', 'type'],
              },
            },
            edges: {
              type: 'array',
              description:
                'Array of edge objects defining transitions between nodes. ' +
                'Each edge has: id, source (node id), target (node id), and optional condition.',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', description: 'Unique edge identifier' },
                  source: { type: 'string', description: 'Source node ID' },
                  target: { type: 'string', description: 'Target node ID' },
                  condition: {
                    type: 'object',
                    description: 'Optional condition for this transition (e.g., { field, operator, value })',
                  },
                  label: { type: 'string', description: 'Optional label for the edge' },
                },
                required: ['id', 'source', 'target'],
              },
            },
            variables: {
              type: 'array',
              description:
                'Context variables available throughout the agent conversation. ' +
                'Each variable has: name, type, defaultValue.',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  type: {
                    type: 'string',
                    enum: ['string', 'number', 'boolean', 'array', 'object'],
                  },
                  defaultValue: { description: 'Default value for the variable' },
                },
                required: ['name', 'type'],
              },
            },
            config: {
              type: 'object',
              description:
                'Global agent configuration: e.g., { model, temperature, maxTurns, fallbackMessage, language }',
            },
          },
          required: ['versionId'],
        },
        _meta: {
          labels: { category: 'agent-studio', access: 'write', complexity: 'complex' },
        },
      },

      // ─── Deployment ───────────────────────────────────────────────────────────
      {
        name: 'ghl_deploy_agent',
        description:
          'Deploy an agent from staging to production. ' +
          'Creates an immutable production snapshot of the current staging version. ' +
          'The agent immediately serves live traffic after deployment.',
        inputSchema: {
          type: 'object',
          properties: {
            agentId: {
              type: 'string',
              description: 'The unique ID of the agent to deploy',
            },
            locationId: {
              type: 'string',
              description: 'Location ID (uses default if not provided)',
            },
            notes: {
              type: 'string',
              description: 'Optional deployment notes / changelog for this version',
            },
          },
          required: ['agentId'],
        },
        _meta: {
          labels: { category: 'agent-studio', access: 'write', complexity: 'simple' },
        },
      },
    ];
  }

  async handleToolCall(toolName: string, args: Record<string, unknown>): Promise<unknown> {
    const config = this.ghlClient.getConfig();
    const locationId = (args.locationId as string) || config.locationId;

    switch (toolName) {
      // ─── Create agent ──────────────────────────────────────────────────────
      case 'ghl_create_agent': {
        const body: Record<string, unknown> = { name: args.name };
        if (args.description !== undefined) body.description = args.description;
        if (args.status !== undefined) body.status = args.status;
        if (locationId) body.locationId = locationId;
        return this.ghlClient.makeRequest('POST', '/agent-studio/agent', body);
      }

      // ─── List agents ───────────────────────────────────────────────────────
      case 'ghl_list_agents': {
        const params = new URLSearchParams();
        if (locationId) params.append('locationId', locationId);
        if (args.status) params.append('status', String(args.status));
        if (args.limit) params.append('limit', String(args.limit));
        if (args.skip) params.append('skip', String(args.skip));
        const qs = params.toString();
        return this.ghlClient.makeRequest('GET', `/agent-studio/agents${qs ? `?${qs}` : ''}`);
      }

      // ─── Get agent ─────────────────────────────────────────────────────────
      case 'ghl_get_agent': {
        return this.ghlClient.makeRequest('GET', `/agent-studio/agent/${args.agentId}?locationId=${encodeURIComponent(this.ghlClient.getConfig().locationId)}`);
      }

      // ─── Update agent ──────────────────────────────────────────────────────
      case 'ghl_update_agent': {
        const body: Record<string, unknown> = {};
        if (args.name !== undefined) body.name = args.name;
        if (args.description !== undefined) body.description = args.description;
        if (args.status !== undefined) body.status = args.status;
        return this.ghlClient.makeRequest('PATCH', `/agent-studio/agent/${args.agentId}`, body);
      }

      // ─── Delete agent ──────────────────────────────────────────────────────
      case 'ghl_delete_agent': {
        return this.ghlClient.makeRequest('DELETE', `/agent-studio/agent/${args.agentId}`);
      }

      // ─── List versions ─────────────────────────────────────────────────────
      case 'ghl_list_agent_versions': {
        const params = new URLSearchParams();
        if (locationId) params.append('locationId', locationId);
        const qs = params.toString();
        return this.ghlClient.makeRequest(
          'GET',
          `/agent-studio/agent/${args.agentId}/versions${qs ? `?${qs}` : ''}`,
        );
      }

      // ─── Update agent version (graph) ──────────────────────────────────────
      case 'ghl_update_agent_version': {
        const body: Record<string, unknown> = {};
        if (args.nodes !== undefined) body.nodes = args.nodes;
        if (args.edges !== undefined) body.edges = args.edges;
        if (args.variables !== undefined) body.variables = args.variables;
        if (args.config !== undefined) body.config = args.config;
        return this.ghlClient.makeRequest(
          'PATCH',
          `/agent-studio/agent/versions/${args.versionId}`,
          body,
        );
      }

      // ─── Deploy agent ──────────────────────────────────────────────────────
      case 'ghl_deploy_agent': {
        const body: Record<string, unknown> = {};
        if (args.notes !== undefined) body.notes = args.notes;
        return this.ghlClient.makeRequest(
          'POST',
          `/agent-studio/agent/${args.agentId}/deploy`,
          body,
        );
      }

      default:
        throw new Error(`Unknown Agent Studio tool: ${toolName}`);
    }
  }
}
