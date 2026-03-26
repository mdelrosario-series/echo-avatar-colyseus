import { getSessionToken } from '../../lib/auth.js';
import { deleteSession } from '../../lib/kv.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const token = getSessionToken(req);
  if (token) await deleteSession(token);
  res.setHeader('Set-Cookie', 'admin_session=; Path=/; HttpOnly; Max-Age=0');
  res.status(200).json({ success: true });
}
