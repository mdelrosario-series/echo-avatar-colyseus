import { StrictMode } from 'react';
import type { ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { theme, applyTheme } from './theme';
import { animDeployOk } from './debug/animDeployDebug';
import { preloadCdnAssets } from './lib/cdnAssets';
import { preloadDefaultAvatar } from './scene/AvatarGlbMesh';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('[Template React Simple] Root element not found');
}

const root = createRoot(rootElement);

const render = (node: ReactNode) => {
  root.render(<StrictMode>{node}</StrictMode>);
};

applyTheme(theme);

animDeployOk('bootstrap', 'client bundle started — if you see this in HUD / __ECHO_ANIM_DEPLOY__, debug pipe is live');

// Pre-fetch all CDN assets (creates blob URLs in production) before first render
// so that getCdnUrl() calls inside components return resolved URLs synchronously.
preloadCdnAssets()
  .then(() => {
    // Warm drei's useGLTF cache with the default avatar so it never
    // suspends when used as a loading/error fallback.
    preloadDefaultAvatar();

    render(
      <ErrorBoundary>
        <App />
      </ErrorBoundary>,
    );
  })
  .catch((err) => {
    console.error('[CDN] Preload failed, rendering anyway:', err);
    render(
      <ErrorBoundary>
        <App />
      </ErrorBoundary>,
    );
  });
