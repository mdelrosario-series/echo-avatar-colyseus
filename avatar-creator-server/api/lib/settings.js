import { kv } from '@vercel/kv';

const PREFIX = 'settings:';

export async function getSetting(key) {
  return await kv.get(PREFIX + key);
}

export async function setSetting(key, value) {
  await kv.set(PREFIX + key, value);
}

export async function getConfigFromKV() {
  const raw = await kv.get(PREFIX + 'config');
  return raw || {};
}

export async function setConfigInKV(entries) {
  await kv.set(PREFIX + 'config', entries);
}
