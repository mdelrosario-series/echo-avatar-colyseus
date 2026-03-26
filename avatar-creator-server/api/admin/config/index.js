import { getSessionToken } from '../../lib/auth.js';
import { getSession } from '../../lib/kv.js';
import { getConfigFromKV, setConfigInKV } from '../../lib/settings.js';

function mask(v) {
  if (typeof v !== 'string' || v.length < 16) return '****';
  return v.slice(0, 8) + '...' + v.slice(-4);
}

export default async function handler(req, res) {
  const token = getSessionToken(req);
  const valid = token && (await getSession(token));
  if (!valid) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  if (req.method === 'GET') {
    const kvConfig = await getConfigFromKV();
    const allowedKeys = ['GEMINI_API_KEY', 'RODIN_API_KEY', 'GEMINI_PROMPT_PREFIX', 'SHOW_BASE_IMAGE'];
    const config = { ...Object.fromEntries(allowedKeys.map((k) => [k, process.env[k] ?? kvConfig[k] ?? ''])), ...kvConfig };
    const items = allowedKeys.map((k) => ({
      key: k,
      value: String(config[k] || ''),
      masked: mask(String(config[k] || '')),
    }));
    res.status(200).json({ config: items });
    return;
  }
  if (req.method === 'POST') {
    const data = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const entries = data.config || {};
    await setConfigInKV(entries);
    res.status(200).json({ success: true });
    return;
  }
  res.status(405).json({ error: 'Method not allowed' });
}
