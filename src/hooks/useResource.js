import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Carrega dados assíncronos (API) com estados de loading, erro e atualização.
 *
 *   const residents = useResource(listMoradores);
 *   const detail    = useResource(() => getMorador(id), id);          // refaz ao mudar `id`
 *   const logs      = useResource(listAcessos, 'logs', { refreshMs: 15000 }); // polling
 *
 * Retorno:
 *  - data, loading, error:  estado da carga inicial / recarga completa
 *  - updatedAt:             Date da última carga bem-sucedida
 *  - refreshError:          erro de uma atualização silenciosa (os dados antigos são mantidos)
 *  - reload():              recarrega mostrando o estado de loading
 *  - refresh():             recarrega em segundo plano, sem trocar a tela por loading
 *  - setData(valor|fn):     altera os dados localmente (ex.: após uma edição)
 *
 * Respostas fora de ordem são descartadas (só a última requisição vale).
 */
export default function useResource(fetcher, key, { refreshMs } = {}) {
  const [state, setState] = useState({
    data: null,
    loading: true,
    error: null,
    updatedAt: null,
    refreshError: null,
  });

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const requestId = useRef(0);

  const load = useCallback(async ({ silent = false } = {}) => {
    const id = (requestId.current += 1);
    if (!silent) setState((s) => ({ ...s, loading: true, error: null, refreshError: null }));

    try {
      const data = await fetcherRef.current();
      if (id !== requestId.current) return;
      setState({ data, loading: false, error: null, updatedAt: new Date(), refreshError: null });
    } catch (error) {
      if (id !== requestId.current) return;
      setState((s) =>
        silent ? { ...s, refreshError: error } : { ...s, loading: false, error, refreshError: null }
      );
    }
  }, []);

  useEffect(() => {
    load();
    return () => {
      requestId.current += 1; // descarta respostas pendentes ao desmontar / trocar a chave
    };
  }, [load, key]);

  useEffect(() => {
    if (!refreshMs) return undefined;
    const timer = setInterval(() => {
      if (!document.hidden) load({ silent: true });
    }, refreshMs);
    return () => clearInterval(timer);
  }, [load, refreshMs]);

  const setData = useCallback((value) => {
    setState((s) => ({ ...s, data: typeof value === 'function' ? value(s.data) : value }));
  }, []);

  return {
    ...state,
    reload: () => load(),
    refresh: () => load({ silent: true }),
    setData,
  };
}
