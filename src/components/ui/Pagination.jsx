import React from 'react';
import { FOCUS_RING } from '../../constants/dashboard';

const btnPager = `inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-white/15 px-3 text-sm font-medium text-slate-300 transition-colors duration-200 hover:border-white/25 hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-white/15 disabled:hover:bg-transparent ${FOCUS_RING}`;

/** Recorta a página atual de uma lista, corrigindo o número da página se necessário. */
export const paginate = (list, page, pageSize) => {
  const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
  const current = Math.min(Math.max(page, 1), totalPages);
  return { rows: list.slice((current - 1) * pageSize, current * pageSize), page: current, totalPages };
};

/** Rodapé de paginação: "Mostrando 1–10 de N" + Anterior / Próxima. */
export default function Pagination({ page, pageSize, total, onChange, noun = 'registros' }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, totalPages);
  const start = total === 0 ? 0 : (current - 1) * pageSize + 1;
  const end = Math.min(current * pageSize, total);

  return (
    <div className="flex flex-col gap-3 border-t border-white/[0.08] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <p className="text-sm text-slate-500">
        Mostrando{' '}
        <span className="text-slate-300">
          {start}–{end}
        </span>{' '}
        de <span className="text-slate-300">{total}</span> {noun}
      </p>
      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <button type="button" onClick={() => onChange(current - 1)} disabled={current <= 1} className={btnPager}>
          <i className="fas fa-chevron-left text-[10px]"></i>
          Anterior
        </button>
        <span className="text-sm tabular-nums text-slate-500">
          Página {current} de {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onChange(current + 1)}
          disabled={current >= totalPages}
          className={btnPager}
        >
          Próxima
          <i className="fas fa-chevron-right text-[10px]"></i>
        </button>
      </div>
    </div>
  );
}
