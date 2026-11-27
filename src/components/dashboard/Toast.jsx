import React from 'react';

/**
 * Aviso temporário no rodapé da tela. Não renderiza nada sem mensagem.
 * `message` pode ser uma string (sucesso) ou { text, type: 'success' | 'error' }.
 */
export default function Toast({ message }) {
  if (!message) return null;

  const { text, type } = typeof message === 'string' ? { text: message, type: 'success' } : message;
  const isError = type === 'error';

  return (
    <div className="fixed bottom-6 left-1/2 z-[60] w-max max-w-[calc(100vw-2rem)] -translate-x-1/2" role={isError ? 'alert' : 'status'}>
      <div className="flex animate-pop items-center gap-2.5 rounded-lg border border-white/[0.08] bg-brand-700 px-4 py-3 text-sm text-slate-100 shadow-overlay motion-reduce:animate-none">
        <i
          className={`fas ${isError ? 'fa-circle-exclamation text-rose-400' : 'fa-circle-check text-emerald-400'} text-xs`}
        ></i>
        {text}
      </div>
    </div>
  );
}
