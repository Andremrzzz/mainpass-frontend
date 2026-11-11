import { useEffect } from 'react';

/**
 * Chama `handler` quando a tecla ESC é pressionada.
 * Com `enabled = false` o listener não é registrado.
 */
export default function useEscapeKey(handler, enabled = true) {
  useEffect(() => {
    if (!enabled) return undefined;

    const onKeyDown = (e) => {
      if (e.key === 'Escape') handler(e);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handler, enabled]);
}
