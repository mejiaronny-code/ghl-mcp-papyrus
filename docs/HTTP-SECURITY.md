# HTTP transport security

The main HTTP server, legacy SSE server, and MCP Apps server use the same Origin, CORS, bearer-token, and bind-host implementation.

Local processes default to `127.0.0.1`. Set `GHL_MCP_BIND_HOST` to override it. The supplied Docker image binds `0.0.0.0` inside the container; Compose publishes only `127.0.0.1:8000:8000` on the host. For standalone Docker, use `-p 127.0.0.1:8000:8000`. A local `.env` that overrides the image bind address must also use `0.0.0.0` inside Docker.

`GHL_MCP_ALLOWED_ORIGINS` is a comma-separated replacement for the remote defaults (`https://chatgpt.com` and `https://chat.openai.com`). Set it to `none` for loopback origins only. HTTP/HTTPS localhost, 127.0.0.1, and [::1] origins are accepted with optional ports. Disallowed supplied Origins return 403. Requests without Origin remain supported for non-browser clients; this is not authentication.

`MCP_SHARED_SECRET` (required, at least 32 characters) gates `Authorization: Bearer <secret>` on data, preview, and MCP routes. The HTTP servers refuse to start without it, and with it unset the middleware fails closed (only GET/HEAD `/health` answers). GET/HEAD `/health` remains public and reveals no account data; allowed CORS preflight is handled before authentication. The secret is compared in constant time over the SHA-256 digests of both sides, so neither the value nor its length leaks through timing. Failed authentication returns a generic 401 JSON body with a Bearer challenge and never says whether the header or the secret failed. This secret is separate from the CRM token. It is an operator shared-secret gate, not MCP OAuth discovery or delegated authorization. For browser preview, use a trusted proxy that supplies the token; do not embed it in a URL or HTML.

The server's own GHL account (`GHL_API_KEY` + `GHL_LOCATION_ID`) is opt-in: it is only used for requests that carry no account headers when `ALLOW_BASE_ACCOUNT=true` is set explicitly. Otherwise every request must supply its own `x-ghl-access-token` and `x-ghl-location-id` headers and is rejected with 401 otherwise. Never log the Authorization header or `x-ghl-access-token` values.

For Kubernetes/PaaS or remote access, bind `0.0.0.0` internally, use TLS at the ingress, restrict network access, configure the bearer token and exact browser origins, and configure the client/proxy to send Authorization. A health check alone does not verify authenticated MCP access. Hosts requiring MCP OAuth need an authorization gateway.

Run `npm test -- --runInBand` for shared middleware and transport regression coverage. Local HTTP listener tests use fake CRM credentials and a mock provider.
