import React from 'react';
import Logo from '../dashboard/Logo';
import ApiStatus from './ApiStatus';
import { FOCUS_RING } from '../../constants/dashboard';
import { btnPrimary } from '../../constants/ui';

/**
 * Barra superior da portaria: menu (mobile), status da API e ação "Escanear QR Code".
 *
 * Props:
 *  - onOpenMenu: abre o drawer lateral (mobile)
 *  - onScan:     abre o leitor de QR Code (será ligado ao modal da câmera)
 */
export default function PortariaHeader({ onOpenMenu, onScan }) {
  return (
    <header className="sticky top-0 z-20 border-b border-white/[0.08] bg-brand-900/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onOpenMenu}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] text-slate-300 transition-colors duration-200 hover:border-white/[0.16] hover:text-white lg:hidden ${FOCUS_RING}`}
            aria-label="Abrir menu"
          >
            <i className="fas fa-bars text-sm"></i>
          </button>

          {/* No desktop a logo já aparece na sidebar fixa */}
          <div className="lg:hidden">
            <Logo wordmarkClassName="hidden sm:inline" />
          </div>

          <p className="hidden text-sm text-slate-400 lg:block">Painel da Portaria</p>
        </div>

        <div className="flex items-center gap-3">
          <ApiStatus />
          <button type="button" onClick={onScan} className={btnPrimary}>
            <i className="fas fa-qrcode text-xs"></i>
            Escanear QR Code
          </button>
        </div>
      </div>
    </header>
  );
}
