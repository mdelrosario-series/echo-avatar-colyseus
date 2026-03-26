import { Client } from '@colyseus/sdk';

function colyseusHttpEndpoint(): string {
  const raw = import.meta.env['VITE_COLYSEUS_URL'] as string | undefined;
  if (raw) return raw.replace(/\/$/, '');
  if (typeof window !== 'undefined' && window.location?.hostname) {
    const proto = window.location.protocol === 'https:' ? 'https:' : 'http:';
    return `${proto}//${window.location.hostname}:2568`;
  }
  return 'http://localhost:2568';
}

let instance: Client | null = null;

/** Shared Colyseus client — supports multiple concurrent room connections (global lobby + game). */
export function getColyseusClient(): Client {
  if (!instance) instance = new Client(colyseusHttpEndpoint());
  return instance;
}
