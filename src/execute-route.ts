/**
 * REST bridge endpoints:
 *   GET  /tools
 *   POST /execute
 */

import type { Application } from 'express';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { ToolRegistry } from './tool-registry.js';
import type { GHLConfig } from './types/ghl-types.js';
import { EnhancedGHLClient } from './enhanced-ghl-client.js';
import { ToolRegistry as ToolRegistryClass } from './tool-registry.js';
import { resolveRequestConfig, RequestConfigError, RequestConfigAuthError } from './request-config.js';
import { toolFailed, toolFailureMessage } from '../scripts/tool-results.cjs';
import { ToolInputError } from '../scripts/tool-schema.cjs';

function toRouteToolDescriptor(tool: Tool) {
  const schema: Record<string, unknown> =
    (tool as any).inputSchema ?? (tool as any).input_schema ?? {};

  return {
    name: tool.name,
    description: tool.description ?? '',
    input_schema: {
      ...schema,
    },
  };
}

export function registerExecuteRoutes(
  app: Application,
  defaultRegistry: ToolRegistry,
  baseConfig?: GHLConfig
): void {
  app.get('/tools', (_req, res) => {
    try {
      const toolDescriptors = defaultRegistry.getAllToolDefinitions().map(toRouteToolDescriptor);
      res.json({ tools: toolDescriptors, count: toolDescriptors.length });
    } catch (err: any) {
      console.error('[execute-route] GET /tools error:', err.message);
      res.status(500).json({ error: 'Failed to list tools' });
    }
  });

  app.post(['/execute', '/tools/call'], async (req, res) => {
    const body = req.body ?? {};
    const toolName: string | undefined = body.name;
    const toolArgs: Record<string, unknown> = body.arguments === undefined ? {} : body.arguments;

    if (!toolName || typeof toolName !== 'string') {
      res.status(400).json({ ok: false, error: { message: 'Body must include a non-empty string "name"' } });
      return;
    }

    try {
      const config = resolveRequestConfig(baseConfig, req.headers);
      const registry = config === baseConfig ? defaultRegistry : new ToolRegistryClass(new EnhancedGHLClient(config));
      const result = await registry.callTool(toolName, toolArgs);
      if (result === undefined) {
        res.status(404).json({ ok: false, error: { message: `Unknown tool: ${toolName}` } });
        return;
      }
      if (toolFailed(result)) {
        res.status(502).json({ ok: false, error: { message: toolFailureMessage(result) }, result });
        return;
      }
      res.json({ ok: true, result });
    } catch (err: any) {
      console.error(`[execute-route] POST /execute tool=${toolName} error:`, err.message);
      const status = err instanceof RequestConfigAuthError ? 401
        : err instanceof RequestConfigError || err instanceof ToolInputError ? 400 : 500;
      res.status(status).json({ ok: false, error: { message: err.message } });
    }
  });
}
