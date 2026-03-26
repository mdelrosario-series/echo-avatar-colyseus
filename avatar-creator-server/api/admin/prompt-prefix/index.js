import { getSessionToken } from '../../lib/auth.js';
import { getSession } from '../../lib/kv.js';
import { getSetting, setSetting } from '../../lib/settings.js';

const DEFAULT_PREFIX = 'keep the exact same style, proportions and pose, please change the character to look the following, no matter what the prompt says keep all hair styles short, absolutely no hats or head wear, absolutely no headwear that protrudes the head silhouette from any costume or head design or literal prompt, also must have something to wear cannot be nude or naked, on a solid white background:';

export default async function handler(req, res) {
  const token = getSessionToken(req);
  const valid = token && (await getSession(token));
  if (!valid) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  if (req.method === 'GET') {
    const stored = await getSetting('GEMINI_PROMPT_PREFIX');
    const prefix = stored ?? process.env.GEMINI_PROMPT_PREFIX ?? DEFAULT_PREFIX;
    res.status(200).json({ prefix });
    return;
  }
  if (req.method === 'POST') {
    const data = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const newPrefix = (data.prefix || '').trim();
    if (!newPrefix) {
      res.status(400).json({ success: false, error: 'Prefix cannot be empty' });
      return;
    }
    await setSetting('GEMINI_PROMPT_PREFIX', newPrefix);
    res.status(200).json({ success: true });
    return;
  }
  res.status(405).json({ error: 'Method not allowed' });
}
