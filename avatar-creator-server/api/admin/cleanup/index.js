import { getSessionToken } from '../../lib/auth.js';
import { getSession } from '../../lib/kv.js';
import { listJobIds } from '../../lib/kv.js';
import { kv } from '@vercel/kv';

const JOB_PREFIX = 'job:';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const token = getSessionToken(req);
  const valid = token && (await getSession(token));
  if (!valid) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const ids = await listJobIds();
  let deleted = 0;
  for (const id of ids) {
    await kv.del(JOB_PREFIX + id);
    deleted++;
  }
  res.status(200).json({ success: true, deleted, files: [] });
}
