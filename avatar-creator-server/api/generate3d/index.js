import { put } from '@vercel/blob';
import { setJob } from '../lib/kv.js';

const WORKER_URL = process.env.WORKER_URL || '';
const WORKER_SECRET = process.env.WORKER_SECRET || '';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  let data;
  try {
    data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch (e) {
    res.status(400).json({ success: false, error: 'Invalid JSON' });
    return;
  }
  const imageB64 = data?.image;
  if (!imageB64) {
    res.status(400).json({ success: false, error: 'No image provided' });
    return;
  }
  if (!WORKER_URL || !WORKER_SECRET) {
    res.status(500).json({
      success: false,
      error: '3D pipeline not configured (WORKER_URL / WORKER_SECRET)',
    });
    return;
  }
  let imageBytes;
  try {
    imageBytes = Buffer.from(imageB64, 'base64');
  } catch (e) {
    res.status(400).json({ success: false, error: 'Invalid base64 image' });
    return;
  }
  const jobId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  let imageUrl;
  try {
    const blob = await put(`jobs/${jobId}/source.png`, imageBytes, {
      access: 'public',
      contentType: 'image/png',
    });
    imageUrl = blob.url;
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to store image: ' + e.message });
    return;
  }
  await setJob(jobId, { status: 'queued', createdAt: Date.now() });
  try {
    const workerRes = await fetch(`${WORKER_URL.replace(/\/$/, '')}/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${WORKER_SECRET}`,
      },
      body: JSON.stringify({ job_id: jobId, image_url: imageUrl }),
      signal: AbortSignal.timeout(45000), // worker returns 200 after accepting job; pipeline runs in background (45s allows cold start + image download)
    });
    if (!workerRes.ok) {
      const text = await workerRes.text();
      await setJob(jobId, { status: 'error', error: `Worker refused: ${workerRes.status} ${text}` });
    }
  } catch (e) {
    await setJob(jobId, { status: 'error', error: 'Worker unreachable: ' + e.message });
  }
  res.status(200).json({ success: true, job_id: jobId });
}
