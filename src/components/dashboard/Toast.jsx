import React from 'react';

/** Aviso temporário no rodapé da tela. Não renderiza nada sem mensagem. */
export default function Toast({ message }) {
  if (!message) return null;

  return (
    <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2" role="status">
      <div className="flex animate-pop items-center gap-2.5 rounded-lg border border-white/[0.08] bg-brand-700 px-4 py-3 text-sm text-slate-100 shadow-overlay motion-reduce:animate-none">
        <i className="fas fa-circle-check text-xs text-emerald-400"></i>
        {message}
      </div>
    </div>
  );
}
  