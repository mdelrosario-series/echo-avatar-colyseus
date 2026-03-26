import { kv } from '@vercel/kv';
import { getJob } from './kv.js';

const AVATAR_PREFIX = 'avatar:';
const OWNER_PREFIX = 'owner:';
const LIBRARY_KEY = 'library:ids';

/**
 * @typedef {{
 *   id: string;
 *   previewImageUrl: string;
 *   glbUrl: string;
 *   jobId?: string;
 *   ownerId: string;
 *   name?: string;
 *   createdAt: number;
 *   publishedAt?: number | null;
 * }} AvatarRecord
 */

function avatarKey(id) {
  return AVATAR_PREFIX + id;
}

export async function createAvatar({ jobId, previewImageUrl, glbUrl, ownerId, name }) {
  const id = `av_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  let resolvedPreview = previewImageUrl;
  let resolvedGlb = glbUrl;

  if (jobId && (!resolvedPreview || !resolvedGlb)) {
    const job = await getJob(jobId);
    if (job?.status === 'done' && job?.result?.glb_url) {
      resolvedGlb = resolvedGlb || job.result.glb_url;
      resolvedPreview = resolvedPreview || job.previewImageUrl || null;
    }
  }

  if (!resolvedGlb) {
    throw new Error('glbUrl required (or jobId with completed job)');
  }

  const record = {
    id,
    previewImageUrl: resolvedPreview || '',
    glbUrl: resolvedGlb,
    jobId: jobId || null,
    ownerId: ownerId || '',
    name: name || null,
    createdAt: Date.now(),
    publishedAt: null,
  };

  await kv.set(avatarKey(id), record);

  if (ownerId) {
    const ownerKey = OWNER_PREFIX + ownerId;
    const existing = (await kv.get(ownerKey)) || [];
    const list = Array.isArray(existing) ? existing : [];
    if (!list.includes(id)) {
      list.push(id);
      await kv.set(ownerKey, list);
    }
  }

  return record;
}

export async function getAvatar(id) {
  if (!id) return null;
  const data = await kv.get(avatarKey(id));
  return data || null;
}

export async function listAvatarsByOwner(ownerId) {
  if (!ownerId) return [];
  const ownerKey = OWNER_PREFIX + ownerId;
  const ids = (await kv.get(ownerKey)) || [];
  const list = Array.isArray(ids) ? ids : [];
  const records = [];
  for (const id of list) {
    const av = await getAvatar(id);
    if (av) records.push(av);
  }
  records.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return records;
}

export async function listPublishedAvatars() {
  const ids = (await kv.get(LIBRARY_KEY)) || [];
  const list = Array.isArray(ids) ? ids : [];
  const records = [];
  for (const id of list) {
    const av = await getAvatar(id);
    if (av && av.publishedAt) records.push(av);
  }
  records.sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0));
  return records;
}

export async function updateAvatar(id, updates) {
  const current = await getAvatar(id);
  if (!current) return null;

  const allowed = ['name', 'publishedAt'];
  const next = { ...current };
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(updates, key)) {
      next[key] = updates[key];
    }
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'publishedAt')) {
    const libraryIds = (await kv.get(LIBRARY_KEY)) || [];
    const list = Array.isArray(libraryIds) ? libraryIds : [];
    if (next.publishedAt) {
      if (!list.includes(id)) {
        list.push(id);
        await kv.set(LIBRARY_KEY, list);
      }
    } else {
      const filtered = list.filter((x) => x !== id);
      await kv.set(LIBRARY_KEY, filtered);
    }
  }

  await kv.set(avatarKey(id), next);
  return next;
}

export async function deleteAvatar(id) {
  const current = await getAvatar(id);
  if (!current) return false;

  await kv.del(avatarKey(id));

  const ownerId = current.ownerId;
  if (ownerId) {
    const ownerKey = OWNER_PREFIX + ownerId;
    const list = (await kv.get(ownerKey)) || [];
    const ids = Array.isArray(list) ? list : [];
    const filtered = ids.filter((x) => x !== id);
    await kv.set(ownerKey, filtered);
  }

  if (current.publishedAt) {
    const libraryIds = (await kv.get(LIBRARY_KEY)) || [];
    const list = Array.isArray(libraryIds) ? libraryIds : [];
    const filtered = list.filter((x) => x !== id);
    await kv.set(LIBRARY_KEY, filtered);
  }

  return true;
}
