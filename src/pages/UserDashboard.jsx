import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Header from '../components/dashboard/Header';
import Sidebar from '../components/dashboard/Sidebar';
import EntryHistory from '../components/dashboard/EntryHistory';
import PassesSection from '../components/dashboard/PassesSection';
import QrModal from '../components/dashboard/QrModal';
import Toast from '../components/dashboard/Toast';
import Profile from './Profile';
import AccessHistory from './AccessHistory';

import useBodyScrollLock from '../hooks/useBodyScrollLock';
import useNow from '../hooks/useNow';
import useToast from '../hooks/useToast';

import { AVAILABLE_MENUS, menuItemsFor } from '../constants/dashboard';
import { MOCK_NOTIFICATIONS, MOCK_PASSES, MOCK_PROFILE } from '../data/mockData';
import { getStatus } from '../utils/passes';
import { ROLES, clearSession, getSession } from '../auth';

/**
 * Dashboard do usuário comum (convidado / morador).
 * Orquestra o layout e mantém apenas o estado global da página;
 * cada bloco visual vive em seu próprio componente.
 */
export default function UserDashboard({ userName: initialName }) {
  const navigate = useNavigate();
  const session = getSession();
  const isPorteiro = session?.role === ROLES.PORTEIRO;

  // TODO: substituir os mocks por chamadas à API (GET /usuarios/me, /passes, /notificacoes)
  const [profile, setProfile] = useState({
    ...MOCK_PROFILE,
    name: initialName || (isPorteiro && session?.user?.name) || MOCK_PROFILE.name,
    ...(isPorteiro && session?.user?.email ? { email: session.user.email } : {}),
  });
  const [activeMenu, setActiveMenu] = useState('passes');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedPassId, setSelectedPassId] = useState(null);
  const [toast, showToast] = useToast();
  const now = useNow(30000);

  const passes = useMemo(
    () => (isPorteiro ? [] : MOCK_PASSES).map((p) => ({ ...p, status: getStatus(p, now) })),
    [now, isPorteiro]
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

  const handleRequestAccess = () => {
    // TODO: abrir formulário / chamar API de solicitação de acesso
    showToast('Solicitação de novo acesso enviada ao morador.');
  };

  const renderContent = () => {
    switch (activeMenu) {
      case 'perfil':
        return <Profile user={profile} onSave={(data) => setProfile((prev) => ({ ...prev, ...data }))} />;
      case 'historico':
        return <AccessHistory />;
      default:
        if (isPorteiro) return <EntryHistory />;
        return (
          <PassesSection
            passes={passes}
            now={now}
            onSelectPass={setSelectedPassId}
            onRequestAccess={handleRequestAccess}
          />
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
        userRole={isPorteiro ? 'Porteiro' : profile.role}
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

      <Toast message={toast} />
    </div>
  );
}
