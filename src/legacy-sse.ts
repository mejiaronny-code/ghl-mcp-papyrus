import type { Application, Request } from 'express';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { RequestConfigError, RequestConfigAuthError } from './request-config.js';

/** Each SSE connection owns its transport and registry; POST delivers to that session. */
export function registerLegacySse(app: Application, factory: (req: Request) => Server | McpServer): void {
  const sessions = new Map<string, { transport: SSEServerTransport; headers: Record<string, unknown> }>();
  app.get('/sse', async (req, res) => {
    let server: Server | McpServer | undefined;
    let transport: SSEServerTransport | undefined;
    try {
      server = factory(req);
      transport = new SSEServerTransport('/sse', res);
      sessions.set(transport.sessionId, { transport, headers: req.headers });
      res.on('close', () => {
        sessions.delete(transport!.sessionId);
        server!.close().catch(() => {});
      });
      await server.connect(transport);
    } catch (error) {
      if (transport) sessions.delete(transport.sessionId);
      if (server) await server.close().catch(() => {});
      if (!res.headersSent) {
        const status = error instanceof RequestConfigAuthError ? 401 : error instanceof RequestConfigError ? 400 : 500;
        res.status(status).json({ error: error instanceof Error ? error.message : 'SSE connection failed' });
      }
    }
  });
  app.post('/sse', async (req, res) => {
    const sessionId = typeof req.query.sessionId === 'string' ? req.query.sessionId : '';
    const session = sessions.get(sessionId);
    if (!session) { res.status(404).json({ error: 'Unknown SSE session' }); return; }
    // A POST may omit context already bound on GET, but cannot switch its account.
    for (const key of ['x-ghl-access-token', 'x-ghl-location-id', 'x-ghl-user-type']) {
      if (req.headers[key] !== undefined && req.headers[key] !== session.headers[key]) {
        res.status(400).json({ error: 'SSE account context cannot change within a session' }); return;
      }
    }
    try {
      await session.transport.handlePostMessage(req, res, req.body);
    } catch {
      if (!res.headersSent) res.status(400).json({ error: 'Invalid SSE message' });
    }
  });
}
