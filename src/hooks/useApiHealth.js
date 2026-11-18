import { useEffect, useState } from 'react';
import { USE_LOCAL } from '../services/api';
import { checkHealth } from '../services/portariaService';

/**
 * Status da API: 'local' (dados no navegador), 'checking', 'online' ou 'offline'.
 * Verifica a saúde da API periodicamente.
 */
export default function useApiHealth(intervalMs = 30000) {
  const [status, setStatus] = useState(USE_LOCAL ? 'local' : 'checking');

  useEffect(() => {
    if (USE_LOCAL) return undefined;

    let cancelled = false;
    const check = async () => {
      try {
        await checkHealth();
        if (!cancelled) setStatus('online');
      } catch (err) {
        if (!cancelled) setStatus('offline');
      }
    };

    check();
    const timer = setInterval(check, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [intervalMs]);

  return status;
}
