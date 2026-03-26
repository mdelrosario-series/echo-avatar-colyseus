/**
 * BackgroundMusicStarter — starts background music on first user interaction.
 *
 * Web browsers require user interaction before playing audio.
 * This component listens for the first click/touch/key and starts the music.
 */

import { useEffect, useRef } from 'react';
import { useAudio } from './AudioContext';

export function BackgroundMusicStarter() {
  const { playBackgroundMusic } = useAudio();
  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (hasStartedRef.current) return;

    const startMusic = async () => {
      if (hasStartedRef.current) return;
      hasStartedRef.current = true;

      try {
        await playBackgroundMusic();
        console.log('[BackgroundMusicStarter] Music started');
      } catch (err) {
        console.error('[BackgroundMusicStarter] Failed to start music:', err);
        hasStartedRef.current = false;
      }

      document.removeEventListener('click', startMusic);
      document.removeEventListener('touchstart', startMusic);
      document.removeEventListener('keydown', startMusic);
    };

    document.addEventListener('click', startMusic, { once: true });
    document.addEventListener('touchstart', startMusic, { once: true });
    document.addEventListener('keydown', startMusic, { once: true });

    return () => {
      document.removeEventListener('click', startMusic);
      document.removeEventListener('touchstart', startMusic);
      document.removeEventListener('keydown', startMusic);
    };
  }, [playBackgroundMusic]);

  return null;
}
