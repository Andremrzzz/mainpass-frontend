import { useEffect } from 'react';

/**
 * Trava o scroll da página enquanto `locked` for verdadeiro
 * (drawer ou modal abertos).
 */
export default function useBodyScrollLock(locked) {
  useEffect(() => {
    if (!locked) return undefined;

    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [locked]);
}
