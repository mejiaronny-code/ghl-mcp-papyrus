import type { GHLConfig, GHLUserType } from './types/ghl-types.js';
import { resolveVersion } from './clients/version-router.js';

/**
 * Builds configuration for an HTTP caller-provided token.
 *
 * A replacement token is independent from the server's configured token, so
 * its preflight scope must never be inherited. Callers may opt into preflight
 * by supplying x-ghl-user-type for that exact token.
 */
export function createPerRequestConfig(
  baseConfig: GHLConfig,
  accessToken: string,
  locationId: string,
  requestedUserType: unknown,
): GHLConfig {
  const userType: GHLUserType | undefined = requestedUserType === 'Company' || requestedUserType === 'Location'
    ? requestedUserType
    : undefined;

  return {
    ...baseConfig,
    accessToken,
    locationId,
    userType,
  };
}

export class RequestConfigError extends Error {}
/** Missing or incomplete per-request account credentials: the caller is not authenticated to any CRM. */
export class RequestConfigAuthError extends RequestConfigError {}

/** Accountless scaffold used to build per-request configs when no base account exists. */
export function createShellConfig(): GHLConfig {
  const apiGeneration = (process.env.GHL_API_GENERATION === 'v2' ? 'v2' : 'v3') as 'v3' | 'v2';
  return {
    accessToken: '',
    baseUrl: process.env.GHL_BASE_URL || 'https://services.leadconnectorhq.com',
    version: resolveVersion([], apiGeneration, process.env.GHL_API_VERSION),
    locationId: '',
    apiGeneration,
    userType: process.env.GHL_USER_TYPE === 'Company' || process.env.GHL_USER_TYPE === 'Location'
      ? process.env.GHL_USER_TYPE
      : undefined,
  };
}

/**
 * The server's own GHL account is opt-in: it must be fully configured
 * (GHL_API_KEY + GHL_LOCATION_ID) AND explicitly enabled with
 * ALLOW_BASE_ACCOUNT=true. Anything less returns undefined, meaning every
 * request must carry its own account headers.
 */
export function buildBaseAccountConfig(env: NodeJS.ProcessEnv = process.env): GHLConfig | undefined {
  const accessToken = (env.GHL_API_KEY || '').trim();
  const locationId = (env.GHL_LOCATION_ID || '').trim();
  const allowBase = (env.ALLOW_BASE_ACCOUNT || '').trim().toLowerCase() === 'true';
  if (!accessToken || !locationId || !allowBase) return undefined;
  return { ...createShellConfig(), accessToken, locationId };
}

/**
 * Resolve the GHL account for a request. Per-request headers always win.
 * Without a full x-ghl-access-token + x-ghl-location-id pair the request may
 * only proceed against the base account, and only when that account is
 * explicitly enabled; otherwise it is rejected (401 at the HTTP layer).
 */
export function resolveRequestConfig(base: GHLConfig | undefined, headers: Record<string, unknown>): GHLConfig {
  const token = headers['x-ghl-access-token'];
  const location = headers['x-ghl-location-id'];
  const userType = headers['x-ghl-user-type'];

  if (token === undefined && location === undefined && userType === undefined) {
    if (base) return base;
    throw new RequestConfigAuthError('Missing account credentials: supply both x-ghl-access-token and x-ghl-location-id headers');
  }
  if (typeof token !== 'string' || !token.trim() || typeof location !== 'string' || !location.trim()) {
    throw new RequestConfigAuthError('Invalid account credentials: supply both x-ghl-access-token and x-ghl-location-id as non-empty headers');
  }
  if (userType !== undefined && userType !== 'Location' && userType !== 'Company') {
    throw new RequestConfigError('x-ghl-user-type must be Location or Company');
  }
  return createPerRequestConfig(base || createShellConfig(), token.trim(), location.trim(), userType);
}
