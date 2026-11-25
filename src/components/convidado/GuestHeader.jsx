import React from 'react';
import Logo from '../dashboard/Logo';
import Badge from '../ui/Badge';
import { FOCUS_RING } from '../../constants/dashboard';
import { GUEST_TABS } from '../../constants/convidado';
import { getInitials } from '../../utils/format';

/**
 * Cabeçalho da visão do Convidado: barra superior, identificação
 * (convidado, anfitrião, unidade) e navegação por abas.
 *
 * Props:
 *  - perfil:      dados do convidado (null enquanto carrega)
 *  - userName:    nome vindo da sessão (usado até o perfil carregar)
 *  - hasActiveQr: há QR Code válido neste momento?
 *  - activeTab / onTab, unread (mensagens não lidas do chat), onLogout
 */
export default function GuestHeader({ perfil, userName, hasActiveQr, activeTab, onTab, unread, onLogout }) {
  const name = perfil?.nome || userName;
  const host = perfil?.anfitriao;

  return (
    <header className="z-20 md:sticky md:top-0 border-b border-white/[0.08] bg-brand-900/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Logo wordmarkClassName="hidden sm:inline" />
          <span className="hidden h-5 w-px bg-white/[0.12] sm:block"></span>
          <Badge tone="info" dot={false}>
            <i className="fas fa-user-check text-[10px]"></i>
            Visão do Convidado
          </Badge>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2.5 md:flex">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-slate-200">
              {getInitials(name)}
            </div>
            <span className="max-w-[10rem] truncate text-sm font-medium text-slate-200">{name}</span>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className={`flex h-9 items-center gap-2 rounded-lg border border-white/[0.08] px-3 text-sm text-slate-300 transition-colors duration-200 hover:border-rose-500/30 hover:text-rose-300 ${FOCUS_RING}`}
          >
            <i className="fas fa-right-from-bracket text-xs"></i>
            <span className="hidden sm:inline">Sair</span>
            <span className="sr-only sm:hidden">Sair</span>
          </button>
        </div>
      </div>

      {/* Identificação */}
      <div className="mx-auto max-w-5xl px-4 pb-4 pt-2 sm:px-6">
        <div className="flex flex-col gap-4 rounded-xl border border-white/[0.08] bg-brand-800 p-4 shadow-card sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-600 text-base font-semibold text-slate-100">
              {getInitials(name)}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Convidado</p>
              <h1 className="truncate text-lg font-semibold leading-tight text-slate-100" data-testid="guest-name">
                {name}
              </h1>
              {host ? (
                <p className="mt-0.5 truncate text-sm text-slate-400" data-testid="guest-host">
                  Convidado(a) de <span className="text-slate-200">{host.nome}</span> · Bloco {host.bloco}, unidade {host.unidade}
                </p>
              ) : (
                <div className="mt-1.5 h-3 w-56 animate-pulse rounded bg-white/[0.06]"></div>
              )}
            </div>
          </div>

          {perfil && (
            <Badge tone={hasActiveQr ? 'success' : 'neutral'}>
              {hasActiveQr ? 'Acesso liberado agora' : 'Sem QR Code ativo'}
            </Badge>
          )}
        </div>
      </div>

      {/* Abas */}
      <nav className="mx-auto max-w-5xl px-4 sm:px-6" aria-label="Seções do convidado">
        <div role="tablist" className="-mb-px flex gap-1 overflow-x-auto">
          {GUEST_TABS.map((t) => {
            const active = activeTab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                id={`tab-${t.key}`}
                aria-selected={active}
                aria-controls={`panel-${t.key}`}
                onClick={() => onTab(t.key)}
                className={`relative flex shrink-0 items-center gap-2 border-b-2 px-3.5 py-3 text-sm font-medium transition-colors duration-200 ${FOCUS_RING} ${
                  active
                    ? 'border-accent-muted text-slate-100'
                    : 'border-transparent text-slate-400 hover:border-white/20 hover:text-slate-200'
                }`}
              >
                <i className={`fas ${t.icon} text-[13px] ${active ? 'text-accent-muted' : 'text-slate-500'}`}></i>
                {t.label}
                {t.key === 'chat' && unread > 0 && (
                  <span
                    className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-semibold text-white"
                    aria-label={`${unread} mensagens não lidas`}
                    data-testid="chat-unread"
                  >
                    {unread}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
