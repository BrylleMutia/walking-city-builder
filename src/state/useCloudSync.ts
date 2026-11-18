import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useGameStore } from './useGameStore';

/**
 * Connects to the game server once the local cache has loaded, and again every
 * time the app returns to the foreground (to credit steps and pick up changes).
 * While in the foreground, connect() also keeps a live channel open so changes
 * from the player's other devices show up within a second; it is closed in the
 * background.
 */
export function useCloudSync() {
  const hydrated = useGameStore((s) => s.hydrated);

  useEffect(() => {
    if (!hydrated) return;
    const { connect } = useGameStore.getState();
    void connect();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void useGameStore.getState().connect();
      else if (state === 'background') useGameStore.getState().pauseLive();
    });
    return () => {
      sub.remove();
      useGameStore.getState().pauseLive();
    };
  }, [hydrated]);
}
