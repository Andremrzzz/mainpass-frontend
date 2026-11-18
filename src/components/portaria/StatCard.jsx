import React from 'react';

/** Indicador numérico do painel. `value` nulo mostra um traço (carregando / indisponível). */
export default function StatCard({ icon, label, value, hint }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-brand-800 p-5 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-400">{label}</p>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-brand-700 text-sm text-slate-300">
          <i className={`fas ${icon}`}></i>
        </div>
      </div>
      <p className="mt-3 text-3xl font-semibold tabular-nums tracking-tight text-slate-100" data-testid={`stat-${label}`}>
        {value ?? '—'}
      </p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
