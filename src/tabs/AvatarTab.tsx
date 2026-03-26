import { useState, useEffect, useRef } from 'react';
import RundotGameAPI from '@series-inc/rundot-game-sdk/api';
import { Button } from '../components/Button';
import { useAvatarGlb } from '../context/AvatarGlbContext';
import { useIsActiveTab } from '../context/ActiveTabContext';
import { avatarApi } from '../api/avatarApi';
import { checkForBannedWords } from '../lib/bannedWords';
import { getCdnUrl } from '../lib/cdnAssets';
import { LibraryTab } from './LibraryTab';

const AVATAR_API_BASE = 'https://avatar-creator-virid.vercel.app';
const POLL_INTERVAL_MS = 2500;

type AvatarResult = { imageBase64: string; imageUrl: string | null };

export const AvatarTab: React.FC = () => {
  const { setAvatar, switchToWorldTab } = useAvatarGlb();
  const isAvatarTabActive = useIsActiveTab('avatar');
  const isAvatarTabActiveRef = useRef(isAvatarTabActive);
  useEffect(() => { isAvatarTabActiveRef.current = isAvatarTabActive; }, [isAvatarTabActive]);
  const [view, setView] = useState<'library' | 'create'>('library');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatingModel, setGeneratingModel] = useState(false);
  const [generationComplete, setGenerationComplete] = useState(false);
  const [generationElapsedSeconds, setGenerationElapsedSeconds] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const progressElapsedRef = useRef(0);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!generatingModel) {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      return;
    }
    progressElapsedRef.current = 0;
    setProgressPercent(0);
    setGenerationElapsedSeconds(0);
    progressTimerRef.current = setInterval(() => {
      progressElapsedRef.current += 1;
      const elapsed = progressElapsedRef.current;
      setGenerationElapsedSeconds(elapsed);
      setProgressPercent(Math.min(Math.sqrt(elapsed / 120) * 90, 90));
    }, 1000);
    return () => { if (progressTimerRef.current) clearInterval(progressTimerRef.current); };
  }, [generatingModel]);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AvatarResult | null>(null);
  const [blockedWords, setBlockedWords] = useState<string[] | null>(null);

  const imageSrc = result
    ? result.imageUrl || (result.imageBase64 ? `data:image/png;base64,${result.imageBase64}` : null)
    : null;

  const generateImage = async () => {
    const base = AVATAR_API_BASE.replace(/\/$/, '');
    const prompt = description.trim();
    if (!prompt) { setError('Enter a character description.'); return; }
    const found = checkForBannedWords(prompt);
    if (found.length > 0) {
      setBlockedWords(found);
      return;
    }

    setResult(null);
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${base}/api/v1/image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || `Request failed (${res.status})`); return; }
      if (data.error && !data.image) { setError(data.error); return; }
      setResult({ imageBase64: data.image ?? '', imageUrl: data.image_url ?? null });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setLoading(false);
    }
  };


  const startModelGeneration = async () => {
    if (!result) return;
    const base = AVATAR_API_BASE.replace(/\/$/, '');
    setError(null);
    setGeneratingModel(true);
    setGenerationElapsedSeconds(0);
    try {
      const body = result.imageUrl ? { image_url: result.imageUrl } : { image: result.imageBase64 };
      const res = await fetch(`${base}/api/v1/model`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || `Request failed (${res.status})`); setGeneratingModel(false); return; }
      const jobId = data.job_id;
      if (!jobId) { setError('No job ID returned'); setGeneratingModel(false); return; }
      let pollCount = 0;
      for (;;) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        pollCount += 1;
        const jobRes = await fetch(`${base}/api/job/${jobId}`);
        const job = await jobRes.json().catch(() => ({}));
        if (job.status === 'done' && job.result?.glb_url) {
          const isFallback = job.result?.is_fallback === true;
          const url = job.result.glb_url.startsWith('http')
            ? job.result.glb_url
            : `${base}${job.result.glb_url.startsWith('/') ? '' : '/'}${job.result.glb_url}`;
          const previewUrl = typeof job.previewImageUrl === 'string' ? job.previewImageUrl : null;
          const ownerId = typeof RundotGameAPI.getProfile === 'function' ? RundotGameAPI.getProfile().id : 'dev';
          if (!isFallback) {
            try {
              await avatarApi.create({ jobId, glbUrl: url, previewImageUrl: previewUrl ?? undefined, ownerId });
            } catch (_) { /* non-blocking */ }
          }
          setProgressPercent(100);
          setGenerationComplete(true);
          if (isFallback) {
            setError("Couldn't generate your custom look this time — here's a stand-in! Feel free to try again.");
          }
          setAvatar(url, previewUrl);
          setResult(null);
          await new Promise((r) => setTimeout(r, 1500));
          setGeneratingModel(false);
          setGenerationComplete(false);
          if (isAvatarTabActiveRef.current) setView('library');
          return;
        }
        if (job.status === 'error') { setError(job.error || 'Model generation failed'); setGeneratingModel(false); return; }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
      setGeneratingModel(false);
    }
  };

  if (view === 'library') {
    return <LibraryTab onCreateNew={() => setView('create')} />;
  }

  return (
    <div className="avatar-tab-root">

      {/* Header */}
      <div className="avatar-tab-header">
        <span className="avatar-tab-header-title">Avatar Preview</span>
        <button className="avatar-tab-close-btn" onClick={() => setView('library')} aria-label="Close">✕</button>
      </div>
      <div className="avatar-preview-card">
        {loading && <div className="avatar-preview-spinner"><div className="avatar-spinner" /></div>}
        {result && imageSrc ? (
          <img src={imageSrc} alt="Generated character" className="avatar-preview-img" />
        ) : (
          <img src={getCdnUrl('AVATAR_BOX')} alt="Avatar placeholder" className="avatar-preview-placeholder" />
        )}
      </div>

      {/* Status text between preview and card */}
      {generatingModel && (
        <p className={`avatar-progress-text${generationComplete ? ' avatar-progress-text--complete' : ''}`}>
          {generationComplete ? 'Avatar Generation Complete!' : 'Creating your 3D Model…'}
        </p>
      )}

      {/* Generator card */}
      <div className="avatar-generator-card">
        {generatingModel ? (
          <div className="avatar-generation-progress">
            <p className="avatar-progress-label">Elapsed Time:</p>
            <p className="avatar-progress-time">
              {Math.floor(generationElapsedSeconds / 60)}:{String(generationElapsedSeconds % 60).padStart(2, '0')}
            </p>
            <div className="avatar-progress-bar-track">
              <div
                className="avatar-progress-bar-fill"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            {generationComplete ? (
              <div className="avatar-complete-spinner" />
            ) : (
              <p className="avatar-muted avatar-progress-hint">This usually takes 1-2 minutes.</p>
            )}
            <Button variant="secondary" size="large" onClick={switchToWorldTab}>
              Return to World
            </Button>
          </div>
        ) : (
          <>
            <h2 className="avatar-generator-title">
              {result ? 'Edit your Avatar' : 'Create your Avatar'}
            </h2>
            <p className="avatar-generator-subtitle">
              {result
                ? <>Not happy with your design? Just edit your description and click <strong>try again</strong>.</>
                : "Describe your character and we'll generate an image."}
            </p>
            <textarea
              className="avatar-textarea"
              placeholder="e.g. a red-haired warrior in leather armor"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
            />
            {error && <p className="avatar-error">{error}</p>}
            {result ? (
              <>
                <Button variant="secondary" size="large" onClick={generateImage} disabled={loading || !description.trim()}>
                  {loading ? 'Generating…' : 'Try Again'}
                </Button>
                <Button variant="primary" size="large" onClick={startModelGeneration}>
                  Get this Avatar
                </Button>
              </>
            ) : (
              <Button variant="primary" size="large" onClick={generateImage} disabled={loading || !description.trim()}>
                {loading ? 'Generating…' : 'Generate'}
              </Button>
            )}
          </>
        )}
      </div>

      {blockedWords && (
        <div className="avatar-delete-confirm-root" role="alertdialog" aria-modal="true" aria-labelledby="banned-words-title">
          <button
            type="button"
            className="avatar-delete-confirm-backdrop"
            aria-label="Close"
            onClick={() => setBlockedWords(null)}
          />
          <div className="avatar-delete-confirm-panel">
            <p id="banned-words-title" className="avatar-delete-confirm-title">Inappropriate Content</p>
            <p className="avatar-muted">Your description contains words that aren't allowed:</p>
            <div className="banned-words-list">
              {blockedWords.map((w) => (
                <span key={w} className="banned-word-chip">{w}</span>
              ))}
            </div>
            <p className="avatar-muted">Please edit your description and try again.</p>
            <div className="avatar-delete-confirm-actions">
              <Button variant="primary" onClick={() => setBlockedWords(null)}>Got it</Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
