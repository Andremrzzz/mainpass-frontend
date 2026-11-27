import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Sidebar from '../components/dashboard/Sidebar';
import Toast from '../components/dashboard/Toast';
import PortariaHeader from '../components/portaria/PortariaHeader';
import OverviewTab from '../components/portaria/OverviewTab';
import ResidentsTab from '../components/portaria/ResidentsTab';
import InvitesTab from '../components/portaria/InvitesTab';
import RequestsTab from '../components/portaria/RequestsTab';
import SupportTab from '../components/portaria/SupportTab';

import useBodyScrollLock from '../hooks/useBodyScrollLock';
import useResource from '../hooks/useResource';
import useToast from '../hooks/useToast';
import { listSolicitacoes } from '../services/portariaService';
import { PORTARIA_MENU_ITEMS, ROLE_LABELS } from '../constants/portaria';
import { clearSession, getSession } from '../auth';

// Cada visão da navegação lateral. `onToast` mostra feedback ao usuário.
const VIEWS = {
  overview: OverviewTab,
  residents: ResidentsTab,
  requests: RequestsTab,
  invites: InvitesTab,
  support: SupportTab,
};

/**
 * Painel da Portaria / Síndico (/portaria).
 * Orquestra layout, navegação entre as 4 visões e feedback global (toast).
 */
export default function Portaria() {
  const navigate = useNavigate();
  const session = getSession();

  const [activeView, setActiveView] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [scanRequest, setScanRequest] = useState(0);
  const [toast, showToast] = useToast(3500);

  // Fila de aprovação: alimenta o contador do menu e a tela de solicitações (atualiza sozinha)
  const requests = useResource(listSolicitacoes, 'requests', { refreshMs: 10000 });
  const pendingCount = (requests.data ?? []).length;
  const menuItems = PORTARIA_MENU_ITEMS.map((i) => (i.key === 'requests' ? { ...i, badge: pendingCount } : i));

  useBodyScrollLock(sidebarOpen);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [activeView]);

  const userName = session?.user?.name || 'Portaria';
  const userRole = ROLE_LABELS[session?.role] || 'Portaria';

  const handleSelect = (key) => {
    setActiveView(key);
    setSidebarOpen(false);
  };

  const handleLogout = () => {
    setSidebarOpen(false);
    clearSession();
    navigate('/', { replace: true });
  };

  // O leitor mora na Visão Geral: leva até lá e pede para retomar a câmera
  const handleScan = () => {
    setActiveView('overview');
    setScanRequest((n) => n + 1);
  };

  const View = VIEWS[activeView];

  return (
    <div className="min-h-screen bg-brand-900 font-sans text-slate-400 antialiased selection:bg-accent selection:text-white">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        items={menuItems}
        activeMenu={activeView}
        onSelect={handleSelect}
        onLogout={handleLogout}
        userName={userName}
        userRole={userRole}
      />

      <div className="lg:pl-64">
        <PortariaHeader onOpenMenu={() => setSidebarOpen(true)} onScan={handleScan} />

        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <View key={activeView} onToast={showToast} scanRequest={scanRequest} requests={requests} />

          <p className="mt-12 text-center text-xs text-slate-600">
            MainPass © {new Date().getFullYear()} — Controle de Acesso
          </p>
        </main>
      </div>

      <Toast message={toast} />
    </div>
  );
}
