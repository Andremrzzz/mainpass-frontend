import React from 'react';

/**
 * Marca do MainPass (ícone + nome).
 * `wordmarkClassName` permite ocultar o nome em telas pequenas.
 */
export default function Logo({ wordmarkClassName = '' }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-white">
        <i className="fas fa-qrcode text-sm"></i>
      </div>
      <span className={`text-base font-semibold tracking-tight text-slate-100 ${wordmarkClassName}`}>
        MainPass
      </span>
    </div>
  );
}
