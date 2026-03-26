import { listJobIds, getJob } from '../lib/kv.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const ids = await listJobIds();
  const files = [];
  for (const id of ids) {
    const job = await getJob(id);
    if (job?.status === 'done' && job?.result) {
      if (job.result.glb_url)
        files.push({ name: job.result.glb_filename || `job${id}.glb`, url: job.result.glb_url, type: 'glb' });
      if (job.result.fbx_url)
        files.push({ name: job.result.fbx_filename || `job${id}_rigged.fbx`, url: job.result.fbx_url, type: 'fbx' });
      if (job.result.blend_url)
        files.push({ name: job.result.blend_filename || `job${id}_comparison.blend`, url: job.result.blend_url, type: 'blend' });
    }
  }
  res.status(200).json({ files });
}
