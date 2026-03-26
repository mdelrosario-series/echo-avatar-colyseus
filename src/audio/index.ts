export { AudioController, audioController, type AudioControllerState } from './AudioController';
export { AudioProvider, useAudio } from './AudioContext';
export { BackgroundMusicStarter } from './BackgroundMusicStarter';

import { audioController } from './AudioController';
import { getCdnUrl } from '../lib/cdnAssets';

/**
 * Standalone function to play UI click sound.
 * Can be called anywhere without needing React hooks.
 */
export function playUiClick(): void {
  void audioController.playSfx(getCdnUrl('AUDIO_UI_SFX'));
}
