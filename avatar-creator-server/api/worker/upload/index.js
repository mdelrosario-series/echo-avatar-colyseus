import { put } from '@vercel/blob';

const WORKER_SECRET = process.env.WORKER_SECRET || '';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const auth = req.headers.authorization;
  if (!WORKER_SECRET || auth !== `Bearer ${WORKER_SECRET}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const pathname = req.query.pathname || req.body?.pathname;
  if (!pathname || typeof pathname !== 'string') {
    res.status(400).json({ error: 'Missing pathname' });
    return;
  }
  let body;
  if (req.body?.data) {
    body = Buffer.from(req.body.data, 'base64');
  } else {
    body = await new Promise((resolve, reject) => {
      const chunks = [];
      req.on('data', (chunk) => chunks.push(chunk));
      req.on('end', () => resolve(Buffer.concat(chunks)));
      req.on('error', reject);
    });
  }
  const contentType = req.headers['content-type']?.split(';')[0] || 'application/octet-stream';
  try {
    const blob = await put(pathname, body, {
      access: 'public',
      contentType,
      addRandomSuffix: false,
    });
    res.status(200).json({ url: blob.url, pathname: blob.pathname });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Upload failed' });
  }
}
