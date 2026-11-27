import React from 'react';
import Logo from './Logo';
import useEscapeKey from '../../hooks/useEscapeKey';
import { FOCUS_RING, MENU_ITEMS } from '../../constants/dashboard';
import { getInitials } from '../../utils/format';

/* -------------------------------------------------------------------------- */
/*  Conteúdo (compartilhado entre a sidebar fixa e o drawer mobile)           */
/* -------------------------------------------------------------------------- */
function SidebarContent({ items, userName, userRole, activeMenu, onSelect, onLogout, onClose }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/[0.08] px-5">
        <Logo />
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className={`flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors duration-200 hover:bg-white/[0.06] hover:text-slate-200 ${FOCUS_RING}`}
            aria-label="Fechar menu"
          >
            <i className="fas fa-xmark"></i>
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5" aria-label="Navegação principal">
        <p className="mb-2 px-3 text-[11px] font-medium uppercase tracking-wider text-slate-500">Menu</p>
        <ul className="space-y-0.5">
          {items.map((item) => {
            const active = activeMenu === item.key;
            return (
              <li key={item.key}>
                <button
                  type="button"
                  onClick={() => onSelect(item.key)}
                  aria-current={active ? 'page' : undefined}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200 ${FOCUS_RING} ${
                    active
                      ? 'bg-white/[0.06] text-slate-100'
                      : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
                  }`}
                >
                  <i
                    className={`fas ${item.icon} w-4 text-center text-[13px] ${
                      active ? 'text-accent-muted' : 'text-slate-500'
                    }`}
                  ></i>
                  {item.label}
                  {item.badge > 0 && (
                    <span className="ml-auto rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-300 ring-1 ring-inset ring-amber-500/30" aria-label={`${item.badge} pendente(s)`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="shrink-0 border-t border-white/[0.08] p-3">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-slate-200">
            {getInitials(userName)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-100">{userName}</p>
            <p className="truncate text-xs text-slate-500">{userRole}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className={`mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors duration-200 hover:bg-rose-500/10 hover:text-rose-400 ${FOCUS_RING}`}
        >
          <i className="fas fa-right-from-bracket w-4 text-center text-[13px]"></i>
          Sair
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sidebar: fixa no desktop (lg+) e drawer deslizante no mobile              */
/*                                                                            */
/*  Props:                                                                    */
/*   - open / onClose: controle do drawer mobile                              */
/*   - activeMenu / onSelect: item de menu ativo e callback de seleção        */
/*   - onLogout: encerra a sessão                                             */
/*   - userName / userRole: identificação exibida no rodapé do menu           */
/* -------------------------------------------------------------------------- */
export default function Sidebar({
  open,
  onClose,
  items = MENU_ITEMS,
  activeMenu,
  onSelect,
  onLogout,
  userName,
  userRole,
}) {
  useEscapeKey(onClose, open);

  const content = { items, userName, userRole, activeMenu, onSelect, onLogout };

  return (
    <>
      {/* Sidebar fixa (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-white/[0.08] bg-brand-800 lg:block">
        <SidebarContent {...content} />
      </aside>

      {/* Drawer (mobile) */}
      <div className={`fixed inset-0 z-40 lg:hidden ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
        <div
          className={`absolute inset-0 bg-black/60 transition-opacity duration-200 ${
            open ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={onClose}
        ></div>

        <aside
          className={`absolute inset-y-0 left-0 w-72 max-w-[85vw] border-r border-white/[0.08] bg-brand-800 shadow-overlay transition-transform duration-200 ease-out ${
            open ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <SidebarContent {...content} onClose={onClose} />
        </aside>
      </div>
    </>
  );
}
