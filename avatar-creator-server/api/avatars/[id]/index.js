import { withCors } from '../../lib/cors.js';
import { getAvatar, updateAvatar, deleteAvatar } from '../../lib/avatars.js';

/**
 * GET /api/avatars/:id – Get one avatar.
 * PATCH /api/avatars/:id – Update name or publishedAt. Body: { name?: string, publishedAt?: number | null }
 */
export default async function handler(req, res) {
  if (withCors(req, res)) {
    res.status(204).end();
    return;
  }

  const id = req.query.id;
  if (!id) {
    res.status(400).json({ error: 'Missing avatar id' });
    return;
  }

  if (req.method === 'GET') {
    const avatar = await getAvatar(id);
    if (!avatar) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    res.status(200).json(avatar);
    return;
  }

  if (req.method === 'PATCH') {
    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    } catch (e) {
      res.status(400).json({ error: 'Invalid JSON' });
      return;
    }
    const updates = {};
    if (typeof body.name === 'string') updates.name = body.name;
    if (Object.prototype.hasOwnProperty.call(body, 'publishedAt')) {
      updates.publishedAt = body.publishedAt == null ? null : Number(body.publishedAt);
    }
    const updated = await updateAvatar(id, updates);
    if (!updated) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    res.status(200).json(updated);
    return;
  }

  if (req.method === 'DELETE') {
    const deleted = await deleteAvatar(id);
    if (!deleted) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    res.status(204).end();
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
