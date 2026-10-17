import { describe, expect, it } from '@jest/globals';
import {
  createPerRequestConfig,
  resolveRequestConfig,
  buildBaseAccountConfig,
  RequestConfigAuthError,
} from '../src/request-config.js';

const base = {
  accessToken: 'server-token',
  baseUrl: 'https://services.leadconnectorhq.com',
  version: 'v3',
  locationId: 'server-location',
  apiGeneration: 'v3' as const,
  userType: 'Company' as const,
};

describe('createPerRequestConfig', () => {
  it('does not inherit the server token userType for an override token', () => {
    expect(createPerRequestConfig(base, 'request-token', 'request-location', undefined)).toEqual({
      ...base,
      accessToken: 'request-token',
      locationId: 'request-location',
      userType: undefined,
    });
  });

  it.each(['Location', 'Company'] as const)('accepts a declared %s token type', (userType) => {
    expect(createPerRequestConfig(base, 'request-token', 'request-location', userType).userType).toBe(userType);
  });

  it('ignores invalid user type headers', () => {
    expect(createPerRequestConfig(base, 'request-token', 'request-location', 'Agency').userType).toBeUndefined();
  });
});

describe('request override boundary', () => {
  it.each([
    {'x-ghl-access-token':'token'}, {'x-ghl-location-id':'location'},
    {'x-ghl-user-type':'Company'}, {'x-ghl-access-token':'','x-ghl-location-id':'location'},
    {'x-ghl-access-token':['token'],'x-ghl-location-id':'location'},
    {'x-ghl-access-token':'token','x-ghl-location-id':'location','x-ghl-user-type':'invalid'},
  ])('rejects incomplete or malformed context %j', headers => { expect(()=>resolveRequestConfig(base,headers)).toThrow(); });

  it('uses the default only when no override is supplied and a base account exists', () => {
    expect(resolveRequestConfig(base,{})).toBe(base);
  });

  it('rejects missing credentials with an auth error when no base account exists', () => {
    expect(() => resolveRequestConfig(undefined, {})).toThrow(RequestConfigAuthError);
    expect(() => resolveRequestConfig(undefined, {'x-ghl-access-token':'token'})).toThrow(RequestConfigAuthError);
    expect(() => resolveRequestConfig(undefined, {'x-ghl-location-id':'location'})).toThrow(RequestConfigAuthError);
    expect(() => resolveRequestConfig(undefined, {'x-ghl-user-type':'Company'})).toThrow(RequestConfigAuthError);
  });

  it('binds the replacement token and location together, with or without a base account', () => {
    for (const baseConfig of [base, undefined]) {
      expect(resolveRequestConfig(baseConfig,{'x-ghl-access-token':'new-token','x-ghl-location-id':'new-location'}))
        .toMatchObject({accessToken:'new-token',locationId:'new-location',userType:undefined});
    }
  });
});

describe('buildBaseAccountConfig', () => {
  const fullEnv = { GHL_API_KEY: 'key', GHL_LOCATION_ID: 'loc' } as NodeJS.ProcessEnv;

  it('stays disabled unless ALLOW_BASE_ACCOUNT=true is explicit', () => {
    expect(buildBaseAccountConfig(fullEnv)).toBeUndefined();
    expect(buildBaseAccountConfig({ ...fullEnv, ALLOW_BASE_ACCOUNT: 'false' })).toBeUndefined();
    expect(buildBaseAccountConfig({ ...fullEnv, ALLOW_BASE_ACCOUNT: 'TRUE' })).toBeDefined();
  });

  it('requires both credentials', () => {
    expect(buildBaseAccountConfig({ GHL_API_KEY: 'key', ALLOW_BASE_ACCOUNT: 'true' })).toBeUndefined();
    expect(buildBaseAccountConfig({ GHL_LOCATION_ID: 'loc', ALLOW_BASE_ACCOUNT: 'true' })).toBeUndefined();
    expect(buildBaseAccountConfig({ GHL_API_KEY: 'key', GHL_LOCATION_ID: 'loc', ALLOW_BASE_ACCOUNT: 'true' })).toBeDefined();
  });
});
