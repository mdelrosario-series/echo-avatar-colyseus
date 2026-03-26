import { withCors } from '../lib/cors.js';
import { listPublishedAvatars } from '../lib/avatars.js';

/**
 * GET /api/library – List published avatars (for browse).
 * Returns: array of avatar records { id, previewImageUrl, glbUrl, ownerId, name, publishedAt, ... }.
 */
export default async function handler(req, res) {
  if (withCors(req, res)) {
    res.status(204).end();
    return;
  }
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const list = await listPublishedAvatars();
  res.status(200).json(list);
}
