import React, { useMemo, useState } from 'react';
import PassCard from './PassCard';
import { FOCUS_RING, PASS_TABS } from '../../constants/dashboard';

const HELP_STEPS = [
  'Crie um novo convite e aguarde a aprovação da portaria.',
  'Com o convite aprovado (status Válido), o QR Code é liberado ao convidado.',
  'O convidado apresenta o QR Code no leitor da portaria, dentro da validade.',
];

/**
 * Seção "Meus acessos": título, ação primária, instruções, filtros e grade de passes.
 * Os estados de filtro, busca e instruções são locais a esta seção.
 *
 * Props:
 *  - passes:           passes com `status` já calculado
 *  - now:              timestamp atual
 *  - onSelectPass:     (id) => void — abre o QrModal
 *  - onRequestAccess:  solicita um novo acesso
 */
export default function PassesSection({ passes, now, onSelectPass, onRequestAccess, onCancelPass }) {
  const [filter, setFilter] = useState('todos');
  const [query, setQuery] = useState('');
  const [showHelp, setShowHelp] = useState(true);

  const counts = useMemo(
    () => ({
      todos: passes.length,
      valido: passes.filter((p) => p.status === 'valido').length,
      pendente: passes.filter((p) => p.status === 'pendente').length,
      recusado: passes.filter((p) => p.status === 'recusado').length,
      expirado: passes.filter((p) => p.status === 'expirado').length,
    }),
    [passes]
  );

  const visiblePasses = useMemo(() => {
    const q = query.trim().toLowerCase();
    return passes.filter((p) => {
      if (filter !== 'todos' && p.status !== filter) return false;
      if (!q) return true;
      return [p.unit, p.host, p.id, p.guest.name].some((v) => v.toLowerCase().includes(q));
    });
  }, [passes, filter, query]);

  const clearFilters = () => {
    setFilter('todos');
    setQuery('');
  };

  return (
    <>
      {/* Título + ação primária */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-100">Meus acessos</h1>
          <p className="mt-1.5 text-sm text-slate-400">
            Crie convites para seus visitantes. O QR Code é liberado depois que a portaria aprovar.
          </p>
        </div>
        <button
          type="button"
          onClick={onRequestAccess}
          className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-white shadow-card transition-colors duration-200 hover:bg-accent-hover ${FOCUS_RING}`}
        >
          <i className="fas fa-plus text-xs"></i>
          Novo convite
        </button>
      </div>

      {/* Como utilizar (dispensável) */}
      {showHelp && (
        <section className="mt-8 rounded-xl border border-white/[0.08] bg-brand-800 p-6 shadow-card">
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-sm font-semibold text-slate-100">Como utilizar seu acesso</h2>
            <button
              type="button"
              onClick={() => setShowHelp(false)}
              className={`-mr-2 -mt-1 flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors duration-200 hover:bg-white/[0.06] hover:text-slate-200 ${FOCUS_RING}`}
              aria-label="Dispensar instruções"
            >
              <i className="fas fa-xmark text-sm"></i>
            </button>
          </div>
          <ol className="mt-4 grid gap-5 sm:grid-cols-3">
            {HELP_STEPS.map((text, i) => (
              <li key={text} className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-white/[0.08] bg-brand-700 text-xs font-medium text-slate-300">
                  {i + 1}
                </span>
                <p className="text-sm leading-snug text-slate-400">{text}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Filtros + busca */}
      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div
          className="-mb-px flex gap-1 overflow-x-auto border-b border-white/[0.08] sm:border-b-0"
          role="tablist"
          aria-label="Filtrar passes por status"
        >
          {PASS_TABS.map((t) => {
            const active = filter === t.key;
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(t.key)}
                className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 pb-3 pt-1 text-sm font-medium transition-colors duration-200 ${FOCUS_RING} ${
                  active
                    ? 'border-accent text-slate-100'
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                {t.label}
                <span
                  className={`rounded-md px-1.5 py-0.5 text-xs ${
                    active ? 'bg-white/[0.08] text-slate-200' : 'bg-white/[0.04] text-slate-500'
                  }`}
                >
                  {counts[t.key]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-64">
          <i className="fas fa-magnifying-glass pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500"></i>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por unidade ou convidado"
            aria-label="Buscar passes"
            className="h-10 w-full rounded-lg border border-white/10 bg-brand-800 pl-9 pr-3 text-sm text-slate-100 placeholder-slate-500 transition-colors duration-200 hover:border-white/20 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
      </div>

      {/* Grade de passes */}
      <div className="mt-6">
        {visiblePasses.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visiblePasses.map((pass) => (
              <PassCard key={pass.id} pass={pass} now={now} onOpen={() => onSelectPass(pass.id)} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-white/[0.12] px-6 py-14 text-center">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg border border-white/[0.08] bg-brand-800 text-slate-500">
              <i className="fas fa-ticket"></i>
            </div>
            <p className="mt-4 text-sm font-medium text-slate-100">Nenhum passe encontrado</p>
            <p className="mt-1 text-sm text-slate-500">Ajuste o filtro ou a busca para ver outros acessos.</p>
            <button
              type="button"
              onClick={clearFilters}
              className={`mt-5 rounded text-sm font-medium text-accent-muted transition-colors duration-200 hover:text-indigo-300 ${FOCUS_RING}`}
            >
              Limpar filtros
            </button>
          </div>
        )}
      </div>
    </>
  );
}
