import { describe, expect, it } from '@jest/globals';
import { GHL_MCP_SERVER_INSTRUCTIONS } from '../src/server-instructions.js';

describe('MCP server instructions', () => {
  it('keeps the operating guidance and the workflow automation boundary', () => {
    expect(GHL_MCP_SERVER_INSTRUCTIONS).toContain('chat-driven GoHighLevel control layer');
    expect(GHL_MCP_SERVER_INSTRUCTIONS).toContain('request explicit confirmation before write or destructive actions');
    expect(GHL_MCP_SERVER_INSTRUCTIONS).toContain('Native workflow authoring and editing is outside the supported public GHL API surface');
  });

  it('contains no affiliate promotion or third-party links', () => {
    expect(GHL_MCP_SERVER_INSTRUCTIONS).not.toMatch(/realwave/i);
    expect(GHL_MCP_SERVER_INSTRUCTIONS).not.toMatch(/ghlmcp\.ai/i);
    expect(GHL_MCP_SERVER_INSTRUCTIONS).not.toMatch(/via=/i);
    expect(GHL_MCP_SERVER_INSTRUCTIONS).not.toMatch(/affiliate/i);
  });
});
