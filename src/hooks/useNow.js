import { useEffect, useState } from 'react';

/**
 * Retorna o timestamp atual e o atualiza a cada `intervalMs`.
 * Usado para recalcular status e contadores de validade dos passes.
 */
export default function useNow(intervalMs = 30000) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
