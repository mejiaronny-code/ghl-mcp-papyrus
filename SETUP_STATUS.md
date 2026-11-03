# Setup Status

Status: fail
Mode: no-network

## Checks
- ok Node >= 20: v24.11.1
- ok dependencies: node_modules present
- fail npm run build: failed
- fail npm run lint: failed
- ok auth-check: skipped until GHL_API_KEY and GHL_LOCATION_ID are provided

## MCP Config
- Client: codex
- Tool profile: curated
- Server path: C:\Users\Alejandro\Desktop\ghl-mcp-papyrus\dist\server.js

## Safety
- Destructive tools run: no
- Write tools run: no

## Remaining Human Actions
- Add GHL_API_KEY to .env. Use a HighLevel private integration or OAuth access token.
- Add GHL_LOCATION_ID to .env. In HighLevel this is the sub-account Location ID.
- Run npm run auth-check after adding real GHL credentials.

GHL_API_VERSION=v3 is the current named HighLevel Version header, not a date. Routing is per endpoint: ad-publishing remains mostly on 2021-07-28; Conversations use v3 in current mode and 2021-04-15 in legacy v2 mode. Set GHL_API_GENERATION=v2 for the legacy surface; v2 mode replaces an unset or starter v3 value with the 2023-02-21 fallback.
