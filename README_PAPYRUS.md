# Despliegue Papyrus AI — servidor MCP remoto de GoHighLevel

Este fork endurece el servidor MCP de GoHighLevel para operar como **servidor
MCP remoto multi-empresa**: cada petición viaja con las credenciales de GHL de
la empresa que la origina y no existe ninguna cuenta de GHL "por defecto" en el
servidor.

## Variables de entorno (Railway)

| Variable | Valor | Notas |
|---|---|---|
| `MCP_SHARED_SECRET` | **obligatoria** | Secreto compartido de entrada. Mínimo **32 caracteres**; genera uno con `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Sin ella (o si es corta) **el proceso no arranca**. |
| `GHL_TOOL_PROFILE` | `full` | Perfil de herramientas completo. |
| `ALLOW_BASE_ACCOUNT` | **no definir** | Solo con `true` (y con `GHL_API_KEY`+`GHL_LOCATION_ID` definidas) el servidor usaría una cuenta propia para peticiones sin cabeceras. En Papyrus **no se define**, así que toda petición debe traer sus cabeceras de cuenta. |
| `GHL_API_KEY` | **NO definir** | No hay cuenta base en el despliegue de Papyrus. |
| `GHL_LOCATION_ID` | **NO definir** | Ídem. |
| `PORT` | la asigna Railway | El servidor escucha en `process.env.PORT` (fallback `MCP_SERVER_PORT`, luego `8000`). |
| `GHL_MCP_BIND_HOST` | `0.0.0.0` | En Railway hay que enlazar todas las interfaces del contenedor. |

Opcionales: `GHL_API_VERSION` (`v3` por defecto), `GHL_API_GENERATION` (`v3`),
`LOG_LEVEL` (`info`), `GHL_MCP_ALLOWED_ORIGINS` (orígenes CORS admitidos además
de loopback; p. ej. el origen de la consola de Papyrus; `none` = solo loopback).

## Build y arranque (Railway)

- Build command: `npm run build`
- Start command: `npm start` (equivale a `node dist/main.js`)

El servidor expone `/mcp` (Streamable HTTP) y `/sse` (SSE legacy).
`GET /health` queda sin autenticación y no revela datos de cuenta.

## Cabeceras que manda el cliente (Papyrus → MCP)

```
Authorization: Bearer <MCP_SHARED_SECRET>   # autenticación de entrada
x-ghl-access-token: <token GHL de la empresa>  # token de la empresa (private integration token u OAuth)
x-ghl-location-id: <locationId de la empresa>  # sub-cuenta GHL de la empresa
```

Opcional: `x-ghl-user-type: Location|Company` cuando el token lo requiera.

Reglas de seguridad activas:

- Sin `Authorization` o con secreto incorrecto → **401** genérico (no indica
  qué falló). Comparación en tiempo constante vía SHA-256 de ambos lados.
- `Authorization` correcta pero **sin ambas** `x-ghl-access-token` y
  `x-ghl-location-id` → **401**. No existe fallback a cuenta base.
- Cada sesión/petición usa **solo** las cabeceras con las que llegó: no hay
  estado compartido de credenciales entre peticiones concurrentes; una sesión
  SSE no puede cambiar de cuenta a mitad de sesión.

## Superficie desactivada

- Las 7 herramientas del workflow-builder interno (`ghl_create_workflow`,
  `ghl_list_workflows_full`, `ghl_get_workflow_full`,
  `ghl_update_workflow_actions`, `ghl_delete_workflow_internal`,
  `ghl_publish_workflow`, `ghl_clone_workflow`) **no se registran**: usaban la
  API interna `backend.leadconnectorhq.com/workflow` con tokens de Firebase.
- `crm_workflow_automation_options` (enlace de afiliado RealWave) eliminada.
- Sin telemetría; el servidor solo llama a `*.leadconnectorhq.com`.

## Ejemplo de inicialización MCP (Streamable HTTP)

```bash
curl -X POST https://<tu-servidor>/mcp \
  -H "Authorization: Bearer $MCP_SHARED_SECRET" \
  -H "x-ghl-access-token: $EMPRESA_GHL_TOKEN" \
  -H "x-ghl-location-id: $EMPRESA_GHL_LOCATION_ID" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"papyrus","version":"1.0"}}}'
```

Cada POST a `/mcp` es autocontenido (incluye siempre las tres cabeceras); el
transporte Streamable HTTP no mantiene sesión entre POSTs.
