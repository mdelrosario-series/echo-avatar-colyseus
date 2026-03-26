import { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import RundotGameAPI from '@series-inc/rundot-game-sdk/api';
import { useAvatarGlb } from '../context/AvatarGlbContext';
import { useIsActiveTab } from '../context/ActiveTabContext';
import { AvatarPreviewScene } from '../scene/AvatarPreviewScene';
import { avatarApi, type AvatarRecord } from '../api/avatarApi';
import { getCdnUrl } from '../lib/cdnAssets';

const MAX_MY_AVATARS = 3;
const MAX_GRID_ITEMS = 4;

function useMyAvatars(ownerId: string) {
  const [list, setList] = useState<AvatarRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!ownerId) return;
    let cancelled = false;
    setLoading(true);
    avatarApi.listMine(ownerId)
      .then((data) => { if (!cancelled) setList(data); })
      .catch(() => { if (!cancelled) setList([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [ownerId]);

  return { list, setList, loading };
}

function useLibraryAvatars() {
  const [list, setList] = useState<AvatarRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    avatarApi.listLibrary()
      .then((data) => { if (!cancelled) setList(data); })
      .catch(() => { if (!cancelled) setList([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [tick]);

  const refresh = () => setTick(t => t + 1);

  return { list, setList, loading, refresh };
}

interface LibraryTabProps {
  onCreateNew?: () => void;
}

export const LibraryTab: React.FC<LibraryTabProps> = ({ onCreateNew }) => {
  const { glbUrl, setAvatar, switchToAvatarTab } = useAvatarGlb();
  const isActive = useIsActiveTab('avatar');
  const ownerId = typeof RundotGameAPI.getProfile === 'function' ? RundotGameAPI.getProfile().id : '';

  const { list: myAvatars, setList: setMyAvatars, loading: myLoading } = useMyAvatars(ownerId);
  const [publishing, setPublishing] = useState(false);
  const [showAllMine, setShowAllMine] = useState(false);
  const [showAllLibrary, setShowAllLibrary] = useState(false);
  const { list: libraryAvatars, setList: setLibraryAvatars, loading: libLoading, refresh: refreshLibrary } = useLibraryAvatars();

  const hasAvatar = !!glbUrl?.trim();
  const previewGlb = hasAvatar ? glbUrl! : getCdnUrl('DEFAULT_AVATAR');

  const currentRecord = myAvatars.find(av => av.glbUrl === glbUrl) ?? null;
  const isPublished = !!currentRecord?.publishedAt;

  const handleUse = (record: AvatarRecord) => {
    setAvatar(record.glbUrl, record.previewImageUrl || null);
  };

  const handlePublish = async () => {
    if (!currentRecord || isPublished || publishing) return;
    setPublishing(true);
    const optimistic = { ...currentRecord, publishedAt: Date.now() };
    setMyAvatars(prev => prev.map(av => av.id === optimistic.id ? optimistic : av));
    setLibraryAvatars(prev => [...prev, optimistic]);
    try {
      const updated = await avatarApi.patch(currentRecord.id, { publishedAt: optimistic.publishedAt });
      setMyAvatars(prev => prev.map(av => av.id === updated.id ? updated : av));
      refreshLibrary();
    } finally {
      setPublishing(false);
    }
  };

  const recentMine = showAllMine ? myAvatars : myAvatars.slice(0, MAX_MY_AVATARS);
  const hasMoreMine = myAvatars.length > MAX_MY_AVATARS;
  const displayedLibrary = showAllLibrary ? libraryAvatars : libraryAvatars.slice(0, MAX_GRID_ITEMS);
  const hasMoreLibrary = libraryAvatars.length > MAX_GRID_ITEMS;

  return (
    <div className="lib-tab-root">
      {/* Avatar Preview */}
      <div className="lib-preview-section">
        <h2 className="lib-preview-title">Avatar Preview</h2>
        <div className="lib-preview-wrap">
          {hasAvatar ? (
            <div className="lib-preview-canvas-inner">
              <Canvas
                frameloop={isActive ? 'always' : 'never'}
                camera={{ position: [0, 0.8, 2.2], fov: 50 }}
                style={{ width: '100%', height: '100%', display: 'block' }}
              >
                <AvatarPreviewScene glbUrl={previewGlb} />
              </Canvas>
            </div>
          ) : (
            <img src={getCdnUrl('AVATAR_BOX')} alt="No avatar selected" className="lib-preview-placeholder" />
          )}
          {/* Trash button — no-op */}
          <button className="lib-preview-trash" disabled aria-label="Delete avatar">
            🗑
          </button>
        </div>
      </div>

      <button
        className="lib-preview-publish"
        onClick={handlePublish}
        disabled={!currentRecord || isPublished || publishing}
      >
        {publishing ? 'Publishing…' : isPublished ? 'Published' : 'Publish'}
      </button>

      {/* My Avatars */}
      <section className="lib-section">
        <h3 className="lib-section-title">My Avatars</h3>
        <div className="lib-grid">
          {/* Create New Avatar — image is the full button */}
          <img
            src={getCdnUrl('CREATE_AVATAR_BTN')}
            alt="Create New Avatar"
            className="lib-grid-create-btn"
            onClick={onCreateNew ?? switchToAvatarTab}
          />
          {myLoading ? null : recentMine.map((av) => {
              const selected = glbUrl === av.glbUrl;
              return (
                <div key={av.id} className={`lib-grid-item${selected ? ' lib-grid-item--selected' : ''}`}>
                  {av.previewImageUrl ? (
                    <img src={av.previewImageUrl} alt="" className="lib-grid-img" />
                  ) : (
                    <div className="lib-grid-img-placeholder" />
                  )}
                  <button
                    className={`lib-grid-btn${selected ? ' lib-grid-btn--selected' : ''}`}
                    onClick={() => !selected && handleUse(av)}
                    disabled={selected}
                  >
                    {selected ? 'Selected' : 'USE'}
                  </button>
                </div>
              );
            })}
        </div>
        {(hasMoreMine || showAllMine) && (
          <button className="lib-see-all-btn" onClick={() => setShowAllMine(v => !v)}>
            {showAllMine ? 'Show less' : 'View all my Avatars'}
          </button>
        )}
      </section>

      {/* Avatar Library */}
      <section className="lib-section">
        <h3 className="lib-section-title">Avatar Library</h3>
        <div className="lib-grid">
          {/* Built-in base avatar */}
          {(() => {
            const baseUrl = getCdnUrl('DEFAULT_AVATAR');
            const selected = glbUrl === baseUrl;
            return (
              <div className={`lib-grid-item${selected ? ' lib-grid-item--selected' : ''}`}>
                <div className="lib-grid-img-placeholder" />
                <button
                  className={`lib-grid-btn${selected ? ' lib-grid-btn--selected' : ''}`}
                  onClick={() => !selected && setAvatar(baseUrl, null)}
                  disabled={selected}
                >
                  {selected ? 'Selected' : 'USE'}
                </button>
              </div>
            );
          })()}
          {!libLoading && displayedLibrary.map((av) => (
            <div key={av.id} className="lib-grid-item">
              {av.previewImageUrl ? (
                <img src={av.previewImageUrl} alt="" className="lib-grid-img" />
              ) : (
                <div className="lib-grid-img-placeholder" />
              )}
              <button className="lib-grid-btn" onClick={() => handleUse(av)}>
                USE
              </button>
            </div>
          ))}
        </div>
        {(hasMoreLibrary || showAllLibrary) && (
          <button className="lib-see-all-btn" onClick={() => setShowAllLibrary((v) => !v)}>
            {showAllLibrary ? 'Show less' : 'See all Published Avatars'}
          </button>
        )}
      </section>
    </div>
  );
};
