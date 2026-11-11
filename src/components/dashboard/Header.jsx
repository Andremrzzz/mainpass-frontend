import React, { useState } from 'react';
import Logo from './Logo';
import useEscapeKey from '../../hooks/useEscapeKey';
import { FOCUS_RING } from '../../constants/dashboard';
import { getInitials } from '../../utils/format';

/**
 * Barra superior: menu (mobile), logo, saudação e notificações.
 * O estado do dropdown de notificações é local a este componente.
 *
 * Props:
 *  - userName:      nome completo do usuário
 *  - notifications: [{ id, icon, text, time }]
 *  - onOpenMenu:    abre o drawer lateral (mobile)
 */
export default function Header({ userName, notifications = [], onOpenMenu }) {
  const [notifOpen, setNotifOpen] = useState(false);
  const closeNotifications = () => setNotifOpen(false);

  useEscapeKey(closeNotifications, notifOpen);

  const firstName = userName.split(' ')[0];

  return (
    <header className="sticky top-0 z-20 border-b border-white/[0.08] bg-brand-900/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Esquerda: menu + logo (mobile) + saudação */}
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

          <p className="truncate text-sm text-slate-400">
            Olá, <span className="font-medium text-slate-100">{firstName}</span>
          </p>
        </div>

        {/* Direita: notificações + usuário */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              type="button"
              onClick={() => setNotifOpen((v) => !v)}
              className={`relative flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] text-slate-300 transition-colors duration-200 hover:border-white/[0.16] hover:text-white ${FOCUS_RING}`}
              aria-label="Notificações"
              aria-expanded={notifOpen}
            >
              <i className="fas fa-bell text-sm"></i>
              {notifications.length > 0 && (
                <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-accent-muted"></span>
              )}
            </button>

            {notifOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={closeNotifications}></div>
                <div className="absolute right-0 z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] animate-pop overflow-hidden rounded-xl border border-white/[0.08] bg-brand-800 shadow-overlay motion-reduce:animate-none">
                  <div className="border-b border-white/[0.08] px-4 py-3 text-sm font-medium text-slate-100">
                    Notificações
                  </div>

                  {notifications.length > 0 ? (
                    <ul className="max-h-72 divide-y divide-white/[0.06] overflow-y-auto">
                      {notifications.map((n) => (
                        <li
                          key={n.id}
                          className="flex gap-3 px-4 py-3.5 transition-colors duration-200 hover:bg-white/[0.03]"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-brand-700 text-xs text-slate-300">
                            <i className={`fas ${n.icon}`}></i>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm leading-snug text-slate-200">{n.text}</p>
                            <p className="mt-1 text-xs text-slate-500">{n.time}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="px-4 py-8 text-center text-sm text-slate-500">
                      Nenhuma notificação por enquanto.
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="hidden h-6 w-px bg-white/[0.08] md:block"></div>

          <div className="hidden items-center gap-2.5 md:flex">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-slate-200">
              {getInitials(userName)}
            </div>
            <span className="max-w-[10rem] truncate text-sm font-medium text-slate-200">{userName}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
