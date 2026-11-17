import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useGameStore } from './useGameStore';

/**
 * Connects to the game server once the local cache has loaded, and again every
 * time the app returns to the foreground (to credit steps and pick up changes).
 */
export function useCloudSync() {
  const hydrated = useGameStore((s) => s.hydrated);

  useEffect(() => {
    if (!hydrated) return;
    const { connect } = useGameStore.getState();
    void connect();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void useGameStore.getState().connect();
    });
    return () => sub.remove();
  }, [hydrated]);
}
