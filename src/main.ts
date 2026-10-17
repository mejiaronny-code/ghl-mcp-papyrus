/**
 * GoHighLevel MCP Server
 *
 * Streamable HTTP transport with optional legacy SSE support.
 */

import express from 'express';
import { createHttpApp, resolveBindHost, describeBinding, assertSharedSecretConfigured } from '../scripts/http-security.cjs';
import * as dotenv from 'dotenv';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';

import { EnhancedGHLClient } from './enhanced-ghl-client.js';
import { ToolRegistry } from './tool-registry.js';
import { GHLConfig } from './types/ghl-types.js';
import { registerExecuteRoutes } from './execute-route.js';
import { resolveVersion } from './clients/version-router.js';
import { resolveRequestConfig, buildBaseAccountConfig, createShellConfig, RequestConfigError, RequestConfigAuthError } from './request-config.js';
import { registerLegacySse } from './legacy-sse.js';
import { GHL_MCP_SERVER_INSTRUCTIONS } from './server-instructions.js';

dotenv.config();

const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 } as const;
type LogLevel = keyof typeof LOG_LEVELS;
const MIN_LEVEL: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

function log(level: LogLevel, msg: string, data?: Record<string, unknown>) {
  if (LOG_LEVELS[level] < LOG_LEVELS[MIN_LEVEL]) return;
  const out = level === 'error' ? process.stderr : process.stderr;
  out.write(JSON.stringify({ ts: new Date().toISOString(), level, msg, ...(data || {}) }) + '\n');
}

function createMcpServer(client: EnhancedGHLClient): McpServer {
  const server = new McpServer(
    { name: 'ghl-mcp-server', version: '3.0.0' },
    {
      capabilities: { tools: {} },
      instructions: GHL_MCP_SERVER_INSTRUCTIONS,
    }
  );
  new ToolRegistry(client).registerAll(server);
  return server;
}

async function main() {
  // Fail closed: no inbound shared secret, no server.
  assertSharedSecretConfigured();

  const port = parseInt(process.env.PORT || process.env.MCP_SERVER_PORT || '8000', 10);
  const config = buildBaseAccountConfig();
  if (!config && (process.env.GHL_API_KEY || process.env.GHL_LOCATION_ID)) {
    log('warn', 'GHL_API_KEY/GHL_LOCATION_ID are set but the base account stays disabled; set ALLOW_BASE_ACCOUNT=true to enable headerless access');
  }
  const ghlClient = config ? new EnhancedGHLClient(config) : undefined;
  const registry = new ToolRegistry(ghlClient ?? new EnhancedGHLClient(createShellConfig()));
  const toolCount = registry.getToolCount();
  const startTime = Date.now();

  log('info', 'Initializing GHL MCP server', {
    baseUrl: config?.baseUrl,
    version: config?.version ?? resolveVersion([], 'v3', process.env.GHL_API_VERSION),
    locationId: config ? config.locationId : undefined,
    baseAccount: config ? 'enabled' : 'disabled (per-request x-ghl-access-token/x-ghl-location-id required)',
    tools: toolCount,
  });

  if (ghlClient) {
    await ghlClient.testConnection();
  }

  const app = createHttpApp();
  app.use((req, _res, next) => {
    log('debug', `${req.method} ${req.path}`, { ip: req.ip });
    next();
  });

  app.all('/mcp', async (req, res) => {
    try {
      const requestConfig = resolveRequestConfig(config, req.headers);
      const client = ghlClient && requestConfig === config ? ghlClient : new EnhancedGHLClient(requestConfig);
      const requestServer = createMcpServer(client);
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
      await requestServer.connect(transport);
      await transport.handleRequest(req, res, req.body);
      res.on('close', () => {
        requestServer.close().catch(() => {});
      });
    } catch (err: any) {
      log('error', 'Streamable HTTP error', { error: err.message });
      if (!res.headersSent) {
        const status = err instanceof RequestConfigAuthError ? 401 : err instanceof RequestConfigError ? 400 : 500;
        res.status(status).json({ error: err instanceof RequestConfigError ? err.message : 'Internal server error' });
      }
    }
  });

  registerLegacySse(app, (req) => {
    const requestConfig = resolveRequestConfig(config, req.headers);
    return createMcpServer(ghlClient && requestConfig === config ? ghlClient! : new EnhancedGHLClient(requestConfig));
  });

  app.get('/', (_req, res) => {
    res.json({
      name: 'GoHighLevel MCP Server',
      version: '3.0.0',
      status: 'running',
      uptime: Math.floor((Date.now() - startTime) / 1000),
      endpoints: {
        health: '/health',
        capabilities: '/capabilities',
        tools: '/tools',
        execute: '/execute',
        mcp: '/mcp',
        sse: '/sse',
      },
      tools: registry.getToolCounts(),
      ...(ghlClient ? { cache: ghlClient.getCacheStats() } : {}),
    });
  });

  app.get('/health', (_req, res) => {
    const mem = process.memoryUsage();
    res.json({
      status: 'healthy',
      server: 'ghl-mcp-server',
      version: '3.0.0',
      uptime: Math.floor((Date.now() - startTime) / 1000),
      timestamp: new Date().toISOString(),
      tools: toolCount,
      memory: {
        rss: `${Math.round(mem.rss / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(mem.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(mem.heapTotal / 1024 / 1024)}MB`,
      },
      ...(ghlClient ? { cache: ghlClient.getCacheStats() } : {}),
    });
  });

  app.get('/capabilities', (_req, res) => {
    res.json({
      capabilities: { tools: {} },
      server: { name: 'ghl-mcp-server', version: '3.0.0' },
      instructions: GHL_MCP_SERVER_INSTRUCTIONS,
      transport: ['streamable-http', 'sse'],
    });
  });

  registerExecuteRoutes(app, registry, config);

  app.get('/tool-inventory', (_req, res) => {
    res.json({
      tools: registry.getToolInventory(),
      count: registry.getToolCount(),
      generatedAt: new Date().toISOString(),
    });
  });

  const bindHost = resolveBindHost();
  app.listen(port, bindHost, () => {
    console.log(describeBinding(bindHost, port));
    console.log('GoHighLevel MCP Server v2.0');
    console.log(`Server: http://${bindHost}:${port}`);
    console.log(`Streamable HTTP: http://${bindHost}:${port}/mcp`);
    console.log(`Legacy SSE: http://${bindHost}:${port}/sse`);
    console.log(`Tools: ${toolCount}`);
    if (!ghlClient) console.log('Base account disabled: every request must carry x-ghl-access-token and x-ghl-location-id');
  });

}

process.on('SIGINT', () => { log('info', 'Shutting down (SIGINT)'); process.exit(0); });
process.on('SIGTERM', () => { log('info', 'Shutting down (SIGTERM)'); process.exit(0); });

main().catch((err) => {
  log('error', 'Fatal error', { error: err.message, stack: err.stack });
  process.exit(1);
});
