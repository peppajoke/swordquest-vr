import { useEffect } from 'react';
import { useVRGame } from '../lib/stores/useVRGame';

export function DeathHandler() {
  const { isDead, respawn } = useVRGame();

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'r' && isDead) {
        respawn();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isDead, respawn]);

  return null;
}