/**
 * Optional API key auth for external API (e.g. /api/v1/*).
 * If API_SECRET or AVATAR_API_KEY is set, require Authorization: Bearer <token> to match.
 */
const API_SECRET = process.env.API_SECRET || process.env.AVATAR_API_KEY || '';

export function requireApiAuth(req, res) {
  if (!API_SECRET) return true;
  const auth = req.headers.authorization || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (token !== API_SECRET) {
    res.status(401).json({ error: 'Unauthorized', message: 'Invalid or missing API key' });
    return false;
  }
  return true;
}
