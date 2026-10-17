/**
 * GoHighLevel MCP HTTP Server — legacy SSE transport.
 */

import express from 'express';
import { registerExecuteRoutes } from './execute-route.js';
import { registerLegacySse } from './legacy-sse.js';
import { resolveRequestConfig, buildBaseAccountConfig, createShellConfig } from './request-config.js';
import { createHttpApp, resolveBindHost, describeBinding, assertSharedSecretConfigured } from '../scripts/http-security.cjs';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError
} from '@modelcontextprotocol/sdk/types.js';
import * as dotenv from 'dotenv';

import { GHLApiClient } from './clients/ghl-api-client.js';
import { ToolRegistry } from './tool-registry.js';
import { GHLConfig } from './types/ghl-types.js';
import { GHL_MCP_SERVER_INSTRUCTIONS } from './server-instructions.js';

dotenv.config();

class GHLMCPHttpServer {
  private app: express.Application;
  private ghlClient: GHLApiClient;
  private registry: ToolRegistry;
  private baseConfig: GHLConfig | undefined;
  private port: number;

  constructor() {
    this.port = parseInt(process.env.PORT || process.env.MCP_SERVER_PORT || '8000', 10);
    this.app = createHttpApp();
    this.baseConfig = buildBaseAccountConfig();
    this.ghlClient = new GHLApiClient(this.baseConfig ?? createShellConfig());
    this.registry = new ToolRegistry(this.ghlClient);
    this.setupRoutes();
  }

  private createSSEServer(registry = this.registry): Server {
    const server = new Server(
      { name: 'ghl-mcp-server', version: '3.0.0' },
      {
        capabilities: { tools: {} },
        instructions: GHL_MCP_SERVER_INSTRUCTIONS,
      }
    );
    registry.registerHandlers(server);

    return server;
  }

  private setupRoutes(): void {
    this.app.get('/health', (_req, res) => {
      res.json({
        status: 'healthy',
        server: 'ghl-mcp-server',
        version: '3.0.0',
        transport: 'sse',
        timestamp: new Date().toISOString(),
        tools: this.registry.getToolCount()
      });
    });

    this.app.get('/capabilities', (_req, res) => {
      res.json({
        capabilities: { tools: {} },
        server: { name: 'ghl-mcp-server', version: '3.0.0' },
        instructions: GHL_MCP_SERVER_INSTRUCTIONS,
      });
    });

    const config = this.baseConfig;
    registerExecuteRoutes(this.app, this.registry, config);
    registerLegacySse(this.app, (req) => {
      const requestConfig = resolveRequestConfig(config, req.headers);
      const registry = config && requestConfig === config ? this.registry : new ToolRegistry(new GHLApiClient(requestConfig));
      return this.createSSEServer(registry);
    });

    this.app.get('/', (_req, res) => {
      res.json({
        name: 'GoHighLevel MCP Server (Legacy SSE)',
        version: '3.0.0',
        status: 'running',
        endpoints: {
          health: '/health',
          capabilities: '/capabilities',
          tools: '/tools',
          sse: '/sse'
        },
        tools: this.registry.getToolCount()
      });
    });
  }

  async start(): Promise<void> {
    assertSharedSecretConfigured();
    if (this.baseConfig) {
      await this.ghlClient.testConnection();
    }
    const bindHost = resolveBindHost();
    this.app.listen(this.port, bindHost, () => {
      console.log(describeBinding(bindHost, this.port));
      console.log(`GoHighLevel MCP legacy SSE server listening on ${this.port}`);
    });
  }
}

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));

async function main(): Promise<void> {
  const server = new GHLMCPHttpServer();
  await server.start();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
