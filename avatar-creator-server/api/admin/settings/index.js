import { getSessionToken } from '../../lib/auth.js';
import { getSession } from '../../lib/kv.js';
import { getSetting, setSetting } from '../../lib/settings.js';

export default async function handler(req, res) {
  const token = getSessionToken(req);
  const valid = token && (await getSession(token));
  if (!valid) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  if (req.method === 'GET') {
    const stored = await getSetting('show_base_image');
    const fallback = process.env.SHOW_BASE_IMAGE !== 'false';
    const show_base_image = stored === undefined ? fallback : stored === 'true' || stored === true;
    res.status(200).json({ show_base_image: !!show_base_image });
    return;
  }
  if (req.method === 'POST') {
    const data = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    if (typeof data.show_base_image === 'boolean') {
      await setSetting('show_base_image', String(data.show_base_image));
    }
    res.status(200).json({ success: true });
    return;
  }
  res.status(405).json({ error: 'Method not allowed' });
}
