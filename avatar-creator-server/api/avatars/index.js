import { withCors } from '../lib/cors.js';
import { createAvatar, listAvatarsByOwner } from '../lib/avatars.js';

/**
 * POST /api/avatars – Create an avatar record (from job or from URLs).
 * Body: { jobId?: string, previewImageUrl?: string, glbUrl?: string, ownerId?: string, name?: string }
 * Returns: avatar record { id, previewImageUrl, glbUrl, ownerId, name, createdAt, publishedAt }.
 *
 * GET /api/avatars?ownerId=xxx – List avatars for owner.
 * Returns: array of avatar records.
 */
export default async function handler(req, res) {
  if (withCors(req, res)) {
    res.status(204).end();
    return;
  }
  if (req.method === 'GET') {
    const ownerId = (req.query && req.query.ownerId) || '';
    const list = await listAvatarsByOwner(ownerId);
    res.status(200).json(list);
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  } catch (e) {
    res.status(400).json({ error: 'Invalid JSON' });
    return;
  }

  const { jobId, previewImageUrl, glbUrl, ownerId, name } = body;

  try {
    const record = await createAvatar({
      jobId: jobId || undefined,
      previewImageUrl: previewImageUrl || undefined,
      glbUrl: glbUrl || undefined,
      ownerId: ownerId || undefined,
      name: name || undefined,
    });
    res.status(201).json(record);
  } catch (e) {
    res.status(400).json({ error: e.message || 'Failed to create avatar' });
  }
}
