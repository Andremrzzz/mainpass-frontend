import React from 'react';
import useApiHealth from '../../hooks/useApiHealth';

const CONFIG = {
  checking: { label: 'Verificando API', dot: 'bg-slate-500', hint: 'Verificando a conexão com a API' },
  online: { label: 'API online', dot: 'bg-emerald-400', hint: 'Conectado à API' },
  offline: { label: 'API offline', dot: 'bg-rose-400', hint: 'Sem conexão com a API' },
  local: { label: 'Armazenamento local', dot: 'bg-amber-400', hint: 'Sem API: os dados ficam salvos neste navegador. Defina VITE_API_URL para usar o servidor' },
};

/** Indicador discreto do estado da API. */
export default function ApiStatus() {
  const status = useApiHealth();
  const c = CONFIG[status];

  return (
    <div
      role="status"
      aria-label={c.hint}
      title={c.hint}
      className="flex items-center gap-2 rounded-lg border border-white/[0.08] px-2.5 py-1.5 text-xs text-slate-400"
    >
      <span className={`h-2 w-2 rounded-full ${c.dot}`}></span>
      <span className="hidden sm:inline">{c.label}</span>
    </div>
  );
}
