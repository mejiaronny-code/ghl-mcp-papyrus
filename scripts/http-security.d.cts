import type { Express } from 'express';
export function createHttpApp(): Express;
export function resolveBindHost(): string;
export function isOriginAllowed(origin: string | undefined | null): boolean;
export function describeBinding(host: string, port: number): string;
export function getSharedSecret(): string;
export function assertSharedSecretConfigured(): void;
