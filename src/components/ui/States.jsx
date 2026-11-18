import React from 'react';
import { btnSecondary } from '../../constants/ui';

/** Esqueleto de carregamento para tabelas e listas. */
export function TableSkeleton({ rows = 6 }) {
  return (
    <div role="status" aria-label="Carregando" className="divide-y divide-white/[0.06]">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-6 px-6 py-4">
          <div className="h-3 w-28 animate-pulse rounded bg-white/[0.06]"></div>
          <div className="h-3 flex-1 animate-pulse rounded bg-white/[0.06]"></div>
          <div className="hidden h-3 w-24 animate-pulse rounded bg-white/[0.06] sm:block"></div>
          <div className="h-5 w-20 animate-pulse rounded-full bg-white/[0.06]"></div>
        </div>
      ))}
    </div>
  );
}

/** Erro de carregamento com botão de nova tentativa. */
export function ErrorState({ error, onRetry }) {
  return (
    <div role="alert" className="px-6 py-14 text-center">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-400">
        <i className="fas fa-triangle-exclamation"></i>
      </div>
      <p className="mt-4 text-sm font-medium text-slate-100">Não foi possível carregar os dados</p>
      <p className="mt-1 text-sm text-slate-500">{error?.message || 'Tente novamente em instantes.'}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className={`${btnSecondary} mt-5`}>
          <i className="fas fa-rotate-right text-xs"></i>
          Tentar novamente
        </button>
      )}
    </div>
  );
}

/** Estado vazio (nenhum resultado). */
export function EmptyState({ icon = 'fa-inbox', title, text, action }) {
  return (
    <div className="px-6 py-14 text-center">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg border border-white/[0.08] bg-brand-700 text-slate-500">
        <i className={`fas ${icon}`}></i>
      </div>
      <p className="mt-4 text-sm font-medium text-slate-100">{title}</p>
      {text && <p className="mt-1 text-sm text-slate-500">{text}</p>}
      {action}
    </div>
  );
}
