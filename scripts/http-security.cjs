'use strict';

const express = require('express');
const cors = require('cors');
const { createHash, timingSafeEqual } = require('node:crypto');

const SHARED_SECRET_MIN_LENGTH = 32;
const LOOPBACK = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;
function resolveBindHost() {
  return (process.env.GHL_MCP_BIND_HOST || '').trim() || '127.0.0.1';
}
function isOriginAllowed(origin) {
  if (!origin || LOOPBACK.test(origin)) return true;
  const raw = (process.env.GHL_MCP_ALLOWED_ORIGINS || '').trim();
  const origins = !raw ? ['https://chatgpt.com', 'https://chat.openai.com']
    : raw.toLowerCase() === 'none' ? [] : raw.split(',').map(value => value.trim());
  return origins.includes(origin);
}
function getSharedSecret() {
  return (process.env.MCP_SHARED_SECRET || '').trim();
}

/** Digest both sides before comparing so the timing and length of the raw secret never leak. */
function secretsMatch(supplied, expected) {
  const suppliedDigest = createHash('sha256').update(String(supplied), 'utf8').digest();
  const expectedDigest = createHash('sha256').update(String(expected), 'utf8').digest();
  return timingSafeEqual(suppliedDigest, expectedDigest);
}

/** Fail closed at startup when the inbound shared secret is missing or weak. */
function assertSharedSecretConfigured() {
  const secret = getSharedSecret();
  if (!secret) {
    throw new Error(
      'MCP_SHARED_SECRET is required. Generate one with ' +
      '`node -e "console.log(require(\'node:crypto\').randomBytes(32).toString(\'hex\'))"` ' +
      'and set it before starting the server.'
    );
  }
  if (secret.length < SHARED_SECRET_MIN_LENGTH) {
    throw new Error(`MCP_SHARED_SECRET must be at least ${SHARED_SECRET_MIN_LENGTH} characters long; refusing to start.`);
  }
}

function createHttpApp() {
  const app = express();
  app.use((req, res, next) => {
    if (isOriginAllowed(req.headers.origin)) return next();
    res.status(403).json({ error: 'Forbidden', reason: 'Origin not allowed' });
  });
  app.use(cors({
    origin: (origin, callback) => callback(null, isOriginAllowed(origin)),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'mcp-session-id', 'mcp-protocol-version', 'Last-Event-ID', 'x-ghl-access-token', 'x-ghl-location-id', 'x-ghl-user-type'],
    exposedHeaders: ['mcp-session-id', 'WWW-Authenticate'],
    credentials: true,
  }));
  app.use((req, res, next) => {
    const secret = getSharedSecret();
    // Only the read-only health endpoint is exempt; preflight was handled by CORS.
    if ((req.method === 'GET' || req.method === 'HEAD') && req.path === '/health') return next();
    // Fail closed: with no secret configured nothing but /health is reachable.
    if (!secret) {
      res.setHeader('WWW-Authenticate', 'Bearer realm="ghl-mcp"');
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const header = req.headers.authorization || '';
    const supplied = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    // Deliberately generic 401: never reveal whether the header or the secret failed.
    if (supplied && secretsMatch(supplied, secret)) return next();
    res.setHeader('WWW-Authenticate', 'Bearer realm="ghl-mcp"');
    res.status(401).json({ error: 'Unauthorized' });
  });
  app.use(express.json());
  return app;
}
function describeBinding(host, port) {
  const auth = getSharedSecret() ? 'bearer token required' : 'no bearer token configured';
  return `bind=${host}:${port}; ${auth}`;
}
module.exports = { createHttpApp, resolveBindHost, isOriginAllowed, describeBinding, assertSharedSecretConfigured, getSharedSecret };
