import { getSessionToken } from '../../lib/auth.js';
import { getSession } from '../../lib/kv.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const token = getSessionToken(req);
  const valid = token && (await getSession(token));
  res.status(200).json({ authed: !!valid });
}
