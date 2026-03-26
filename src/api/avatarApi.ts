const AVATAR_API_BASE = 'https://avatar-creator-virid.vercel.app';

export interface AvatarRecord {
  id: string;
  previewImageUrl: string;
  glbUrl: string;
  jobId?: string | null;
  ownerId: string;
  name?: string | null;
  createdAt: number;
  publishedAt?: number | null;
}

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<T> {
  const url = `${AVATAR_API_BASE.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: options.body != null ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error || `Request failed (${res.status})`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const avatarApi = {
  create(params: {
    jobId?: string;
    previewImageUrl?: string | null;
    glbUrl?: string | null;
    ownerId?: string | null;
    name?: string | null;
  }): Promise<AvatarRecord> {
    return request<AvatarRecord>('/api/avatars', {
      method: 'POST',
      body: {
        jobId: params.jobId || undefined,
        previewImageUrl: params.previewImageUrl || undefined,
        glbUrl: params.glbUrl || undefined,
        ownerId: params.ownerId || undefined,
        name: params.name || undefined,
      },
    });
  },

  listMine(ownerId: string): Promise<AvatarRecord[]> {
    return request<AvatarRecord[]>(`/api/avatars?ownerId=${encodeURIComponent(ownerId)}`);
  },

  get(id: string): Promise<AvatarRecord> {
    return request<AvatarRecord>(`/api/avatars/${encodeURIComponent(id)}`);
  },

  patch(id: string, updates: { name?: string; publishedAt?: number | null }): Promise<AvatarRecord> {
    return request<AvatarRecord>(`/api/avatars/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: updates,
    });
  },

  listLibrary(): Promise<AvatarRecord[]> {
    return request<AvatarRecord[]>('/api/library');
  },

  delete(id: string): Promise<void> {
    return request<void>(`/api/avatars/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },
};
