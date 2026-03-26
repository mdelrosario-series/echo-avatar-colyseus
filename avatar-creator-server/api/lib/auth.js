export function getSessionToken(req) {
  const cookie = (req.headers && (req.headers['cookie'] || req.headers.get?.('cookie'))) || '';
  for (const part of cookie.split(';')) {
    const t = part.trim();
    if (t.startsWith('admin_session=')) return t.slice('admin_session='.length).trim();
  }
  return null;
}

export function requireAdmin(getSessionFn) {
  return async (req) => {
    const token = getSessionToken(req);
    const valid = token && (await getSessionFn(token));
    if (!valid) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return null;
  };
}
