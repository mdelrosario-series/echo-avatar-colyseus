import { createContext, useContext } from 'react';
import type { TabId } from '../tabs/tabConfig';

export const ActiveTabContext = createContext<TabId>('home');

export function useIsActiveTab(tabId: TabId): boolean {
  return useContext(ActiveTabContext) === tabId;
}
