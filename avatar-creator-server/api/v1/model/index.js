import { put } from '@vercel/blob';
import { setJob } from '../../lib/kv.js';
import { requireApiAuth } from '../../lib/apiAuth.js';
import { withCors } from '../../lib/cors.js';

const WORKER_URL = process.env.WORKER_URL || '';
const WORKER_SECRET = process.env.WORKER_SECRET || '';

/**
 * POST /api/v1/model
 * Start 3D model generation from an image. Returns job_id; poll GET /api/job/:id until status is "done", then use result.glb_url.
 *
 * Body: { image: string (base64) } | { image_url: string }
 *
 * Returns: { job_id: string }
 * - Poll GET /api/job/:job_id until status === "done" (or "error").
 * - When done: job.result.glb_url (GLB), job.result.fbx_url (FBX).
 */
export default async function handler(req, res) {
  if (withCors(req, res)) {
    res.status(200).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!requireApiAuth(req, res)) return;

  if (!WORKER_URL || !WORKER_SECRET) {
    res.status(503).json({ error: '3D pipeline not configured (WORKER_URL / WORKER_SECRET)' });
    return;
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  } catch (e) {
    res.status(400).json({ error: 'Invalid JSON' });
    return;
  }

  let imageUrl;
  if (body.image_url && typeof body.image_url === 'string') {
    imageUrl = body.image_url.trim();
    if (!imageUrl) {
      res.status(400).json({ error: 'Empty image_url' });
      return;
    }
  } else if (body.image) {
    let imageBytes;
    try {
      imageBytes = Buffer.from(body.image, 'base64');
      if (imageBytes.length === 0) throw new Error('empty');
    } catch (e) {
      res.status(400).json({ error: 'Invalid base64 image' });
      return;
    }
    const jobId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    try {
      const blob = await put(`jobs/${jobId}/source.png`, imageBytes, {
        access: 'public',
        contentType: 'image/png',
      });
      imageUrl = blob.url;
    } catch (e) {
      res.status(500).json({ error: 'Failed to store image: ' + e.message });
      return;
    }
    await setJob(jobId, { status: 'queued', createdAt: Date.now(), previewImageUrl: imageUrl });
    try {
      const workerRes = await fetch(`${WORKER_URL.replace(/\/$/, '')}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${WORKER_SECRET}`,
        },
        body: JSON.stringify({ job_id: jobId, image_url: imageUrl }),
        signal: AbortSignal.timeout(45000),
      });
      if (!workerRes.ok) {
        const text = await workerRes.text();
        await setJob(jobId, { status: 'error', error: `Worker refused: ${workerRes.status} ${text}` });
      }
    } catch (e) {
      await setJob(jobId, { status: 'error', error: 'Worker unreachable: ' + e.message });
    }
    res.status(200).json({ job_id: jobId });
    return;
  }

  if (!imageUrl) {
    res.status(400).json({ error: 'Provide image (base64) or image_url' });
    return;
  }

  // image_url path: create job and trigger worker
  const jobId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  await setJob(jobId, { status: 'queued', createdAt: Date.now(), previewImageUrl: imageUrl });
  try {
    const workerRes = await fetch(`${WORKER_URL.replace(/\/$/, '')}/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${WORKER_SECRET}`,
      },
      body: JSON.stringify({ job_id: jobId, image_url: imageUrl }),
      signal: AbortSignal.timeout(45000),
    });
    if (!workerRes.ok) {
      const text = await workerRes.text();
      await setJob(jobId, { status: 'error', error: `Worker refused: ${workerRes.status} ${text}` });
    }
  } catch (e) {
    await setJob(jobId, { status: 'error', error: 'Worker unreachable: ' + e.message });
  }
  res.status(200).json({ job_id: jobId });
}
