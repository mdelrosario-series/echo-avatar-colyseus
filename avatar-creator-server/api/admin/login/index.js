import { setSession } from '../../lib/kv.js';
import { randomBytes } from 'crypto';

const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || '';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const data = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  if (data.username !== ADMIN_USER || data.password !== ADMIN_PASS) {
    res.status(401).json({ success: false, error: 'Invalid credentials' });
    return;
  }
  const token = randomBytes(32).toString('hex');
  await setSession(token);
  res.setHeader('Set-Cookie', `admin_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`);
  res.status(200).json({ success: true });
}
