import { getJob } from '../../lib/kv.js';
import { withCors } from '../../lib/cors.js';

export default async function handler(req, res) {
  if (withCors(req, res)) {
    res.status(200).end();
    return;
  }
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  let jobId = req.query.id;
  if (!jobId && req.url) {
    const match = req.url.match(/\/api\/job\/([^/?]+)/);
    if (match) jobId = match[1];
  }
  if (!jobId) {
    res.status(400).json({ error: 'Missing job id' });
    return;
  }
  const job = await getJob(jobId);
  if (!job) {
    res.status(404).json({ status: 'not_found' });
    return;
  }
  res.status(200).json(job);
}
