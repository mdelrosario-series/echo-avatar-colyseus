// ---------------------------------------------------------------------------
// AvatarHandler — validates and processes setAvatar messages.
//
// Checks:
//  1. avatarUrl must be a string
//  2. avatarUrl length capped at 512 chars
// ---------------------------------------------------------------------------
// ---- Handler ----
export function handleAvatar(senderId, payload, manager) {
    const player = manager.get(senderId);
    if (!player)
        return { accepted: false, avatarUrl: '' };
    const url = typeof payload.avatarUrl === 'string'
        ? payload.avatarUrl.slice(0, 512)
        : '';
    player.avatarUrl = url;
    return { accepted: true, avatarUrl: url };
}
