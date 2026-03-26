import type { ReactNode } from 'react';
import { WorldTab } from './WorldTab';
import { HomeTab } from './HomeTab';
import { AvatarTab } from './AvatarTab';
import { SettingsTab } from './SettingsTab';

export interface TabDefinition {
  /**
   * Stable identifier used for routing and analytics.
   */
  id: string;
  /**
   * Tab label text rendered in the UI.
   */
  label: string;
  /**
   * Emoji or icon string used in the tab bar.
   */
  icon: string;
  /**
   * Render function invoked by the shell.
   */
  render: () => ReactNode;
}

export const TAB_CONFIG = [
  {
    id: 'home',
    label: 'HOME',
    icon: '🏠',
    render: () => <HomeTab />,
  },
  {
    id: 'world',
    label: 'WORLD',
    icon: '🌍',
    render: () => <WorldTab />,
  },
  {
    id: 'avatar',
    label: 'AVATAR',
    icon: '👤',
    render: () => <AvatarTab />,
  },
  {
    id: 'settings',
    label: 'SETTINGS',
    icon: '⚙️',
    render: () => <SettingsTab />,
  },
] as const satisfies ReadonlyArray<TabDefinition>;

export type TabConfigEntry = (typeof TAB_CONFIG)[number];
export type TabId = TabConfigEntry['id'];

export const DEFAULT_TAB_ID: TabId = TAB_CONFIG[0]!.id;
