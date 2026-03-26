import { kv } from '@vercel/kv';

const JOB_PREFIX = 'job:';
const SESSION_PREFIX = 'admin_session:';
const SESSION_TTL = 60 * 60 * 24; // 24 hours

export async function getJob(jobId) {
  const key = JOB_PREFIX + jobId;
  const data = await kv.get(key);
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch (_) {
      return data;
    }
  }
  return data;
}

export async function setJob(jobId, value) {
  const key = JOB_PREFIX + jobId;
  await kv.set(key, value);
}

export async function setJobStatus(jobId, status, extra = {}) {
  const current = (await getJob(jobId)) || {};
  await setJob(jobId, { ...current, status, ...extra });
}

export async function getSession(token) {
  if (!token) return null;
  const key = SESSION_PREFIX + token;
  return await kv.get(key);
}

export async function setSession(token) {
  const key = SESSION_PREFIX + token;
  await kv.set(key, '1', { ex: SESSION_TTL });
}

export async function deleteSession(token) {
  if (!token) return;
  await kv.del(SESSION_PREFIX + token);
}

export async function listJobIds() {
  const keys = await kv.keys(JOB_PREFIX + '*');
  return keys.map((k) => k.slice(JOB_PREFIX.length));
}
