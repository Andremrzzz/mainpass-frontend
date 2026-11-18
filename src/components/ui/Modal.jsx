import React, { useEffect, useRef } from 'react';
import useEscapeKey from '../../hooks/useEscapeKey';
import useBodyScrollLock from '../../hooks/useBodyScrollLock';
import { FOCUS_RING } from '../../constants/dashboard';

const SIZES = { md: 'sm:max-w-lg', lg: 'sm:max-w-2xl' };

/**
 * Modal padrão (bottom sheet no celular, diálogo centralizado no desktop).
 *
 * Props:
 *  - title / subtitle: cabeçalho
 *  - onClose:          fecha (ESC, clique no fundo e botão X)
 *  - footer:           área fixa de ações no rodapé
 *  - size:             'md' | 'lg'
 *  - dismissible:      false bloqueia o fechamento (ex.: enquanto salva)
 */
export default function Modal({ title, subtitle, onClose, children, footer, size = 'md', dismissible = true }) {
  const panelRef = useRef(null);

  useEscapeKey(onClose, dismissible);
  useBodyScrollLock(true);

  // Leva o foco para dentro do diálogo ao abrir
  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="absolute inset-0 animate-fade bg-black/60 backdrop-blur-sm motion-reduce:animate-none"
        onClick={dismissible ? onClose : undefined}
      ></div>

      <div
        ref={panelRef}
        tabIndex={-1}
        className={`relative flex max-h-[92vh] w-full animate-pop flex-col overflow-hidden rounded-t-2xl border border-white/[0.08] bg-brand-800 shadow-overlay outline-none motion-reduce:animate-none sm:rounded-xl ${SIZES[size]}`}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/[0.08] px-6 py-5">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold leading-snug text-slate-100">{title}</h2>
            {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={!dismissible}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-500 transition-colors duration-200 hover:bg-white/[0.06] hover:text-slate-200 disabled:opacity-40 ${FOCUS_RING}`}
            aria-label="Fechar"
          >
            <i className="fas fa-xmark"></i>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>

        {footer && <div className="shrink-0 border-t border-white/[0.08] px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}
