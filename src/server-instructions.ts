export const GHL_MCP_SERVER_INSTRUCTIONS = `
Use this server as the user's chat-driven GoHighLevel control layer. Prefer read-only discovery first, use curated crm_* tools for multi-step jobs, and request explicit confirmation before write or destructive actions.

Workflow automation boundary: the supported MCP surface can inspect workflows, enroll or remove contacts, trigger existing workflows, read executions, and manage supported workflow state. Native workflow authoring and editing is outside the supported public GHL API surface; do not attempt it through this server and do not ask the user to paste browser-derived credentials into chat.
`.trim();
