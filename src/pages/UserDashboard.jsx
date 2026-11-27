import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Header from '../components/dashboard/Header';
import Sidebar from '../components/dashboard/Sidebar';
import EntryHistory from '../components/dashboard/EntryHistory';
import PassesSection from '../components/dashboard/PassesSection';
import NewInviteModal from '../components/dashboard/NewInviteModal';
import { EmptyState, ErrorState, TableSkeleton } from '../components/ui/States';
import QrModal from '../components/dashboard/QrModal';
import Toast from '../components/dashboard/Toast';
import Profile from './Profile';
import AccessHistory from './AccessHistory';

import useBodyScrollLock from '../hooks/useBodyScrollLock';
import useNow from '../hooks/useNow';
import useResource from '../hooks/useResource';
import useToast from '../hooks/useToast';
import { listMeusConvites } from '../services/conviteService';

import { AVAILABLE_MENUS, menuItemsFor } from '../constants/dashboard';
import { MOCK_NOTIFICATIONS, MOCK_PROFILE } from '../data/mockData';
import { getStatus, toPass } from '../utils/passes';
import { ROLES, clearSession, getSession } from '../auth';
import { ROLE_LABELS } from '../constants/portaria';

/**
 * Dashboard do Morador (ROLE_USER). O Convidado usa /convidado; o porteiro vê só o histórico de entradas.
 * Orquestra o layout e mantém apenas o estado global da página;
 * cada bloco visual vive em seu próprio componente.
 */
export default function UserDashboard({ userName: initialName }) {
  const navigate = useNavigate();
  const session = getSession();
  const isPorteiro = session?.role === ROLES.PORTEIRO;
  // Papel exibido vem SEMPRE da sessão (Morador, Convidado, Porteiro...), nunca de um texto fixo
  const roleLabel = ROLE_LABELS[session?.role] ?? 'Morador';

  // TODO: substituir os mocks por chamadas à API (GET /usuarios/me, /passes, /notificacoes)
  const [profile, setProfile] = useState({
    ...MOCK_PROFILE,
    role: roleLabel,
    name: initialName || (isPorteiro && session?.user?.name) || MOCK_PROFILE.name,
    ...(isPorteiro && session?.user?.email ? { email: session.user.email } : {}),
  });
  const [activeMenu, setActiveMenu] = useState('passes');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedPassId, setSelectedPassId] = useState(null);
  const [toast, showToast] = useToast();
  const [creating, setCreating] = useState(false);
  const now = useNow(30000);

  // Convites do morador (o status muda sozinho quando a portaria aprova/recusa: atualiza a cada 15 s)
  const convites = useResource(isPorteiro ? () => Promise.resolve([]) : listMeusConvites, isPorteiro ? 'none' : 'my-invites', { refreshMs: 15000 });

  const passes = useMemo(
    () => (convites.data ?? []).map((c) => toPass(c, profile.name)).map((p) => ({ ...p, status: getStatus(p, now) })),
    [convites.data, now, profile.name]
  );
  const selectedPass = passes.find((p) => p.id === selectedPassId) ?? null;

  // Trava o scroll do fundo quando há drawer ou modal aberto
  useBodyScrollLock(sidebarOpen || Boolean(selectedPass));

  const handleMenuSelect = (key) => {
    setActiveMenu(key);
    setSidebarOpen(false);
    if (!AVAILABLE_MENUS.includes(key)) showToast('Esta seção estará disponível em breve.');
  };

  const handleLogout = () => {
    setSidebarOpen(false);
    clearSession();
    navigate('/', { replace: true });
  };

  const handleCreated = () => convites.refresh();

  const renderContent = () => {
    switch (activeMenu) {
      case 'perfil':
        return <Profile user={profile} onSave={(data) => setProfile((prev) => ({ ...prev, ...data }))} />;
      case 'historico':
        return <AccessHistory />;
      default:
        if (isPorteiro) return <EntryHistory />;
        if (convites.loading) return <TableSkeleton rows={4} />;
        if (convites.error) return <ErrorState error={convites.error} onRetry={convites.reload} />;
        return (
          <>
            {passes.length === 0 ? (
              <div className="rounded-xl border border-white/[0.08] bg-brand-800">
                <EmptyState icon="fa-ticket" title="Você ainda não criou convites" text="Crie um convite para um visitante. A portaria aprova e o QR Code é liberado." />
                <div className="pb-8 text-center">
                  <button type="button" onClick={() => setCreating(true)} className="inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-white hover:bg-accent-hover">
                    <i className="fas fa-plus text-xs"></i>Novo convite
                  </button>
                </div>
              </div>
            ) : (
              <PassesSection passes={passes} now={now} onSelectPass={setSelectedPassId} onRequestAccess={() => setCreating(true)} />
            )}
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-brand-900 font-sans text-slate-400 antialiased selection:bg-accent selection:text-white">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        items={menuItemsFor(isPorteiro)}
        activeMenu={activeMenu}
        onSelect={handleMenuSelect}
        onLogout={handleLogout}
        userName={profile.name}
        userRole={roleLabel}
      />

      <div className="lg:pl-64">
        <Header
          userName={profile.name}
          notifications={MOCK_NOTIFICATIONS}
          onOpenMenu={() => setSidebarOpen(true)}
        />

        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          {renderContent()}

          <p className="mt-12 text-center text-xs text-slate-600">
            MainPass © {new Date().getFullYear()} — Controle de Acesso
          </p>
        </main>
      </div>

      {!isPorteiro && selectedPass && (
        <QrModal
          pass={selectedPass}
          now={now}
          onClose={() => setSelectedPassId(null)}
          onToast={showToast}
        />
      )}

      {creating && !isPorteiro && (
        <NewInviteModal onClose={() => setCreating(false)} onCreated={handleCreated} />
      )}

      <Toast message={toast} />
    </div>
  );
}
