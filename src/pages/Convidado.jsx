import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import GuestHeader from '../components/convidado/GuestHeader';
import QrCodesTab from '../components/convidado/QrCodesTab';
import EntriesTab from '../components/convidado/EntriesTab';
import ChatTab from '../components/convidado/ChatTab';
import ProfileTab from '../components/convidado/ProfileTab';
import Toast from '../components/dashboard/Toast';
import { ErrorState, TableSkeleton } from '../components/ui/States';

import useGuestChat from '../hooks/useGuestChat';
import useNow from '../hooks/useNow';
import useResource from '../hooks/useResource';
import useToast from '../hooks/useToast';
import { getConvidado, resetarDemonstracao, updatePreferencias } from '../services/convidadoService';
import { ARRIVAL_MESSAGE, RENEWAL_MESSAGE } from '../constants/convidado';
import { getQrStatus, playBeep } from '../utils/convidado';
import { clearSession, getSession } from '../auth';

/**
 * Visão do Convidado (/convidado): QR Codes, entradas, chat e perfil.
 * Dados vêm de services/convidadoService.js (localStorage hoje, API depois).
 */
export default function Convidado() {
  const navigate = useNavigate();
  const session = getSession();
  const [tab, setTab] = useState('qrcodes');
  const [toast, showToast] = useToast(3500);
  const now = useNow(15000);
  const data = useResource(getConvidado, 'guest', { refreshMs: 15000 });

  const perfil = data.data?.perfil ?? null;
  const prefs = perfil?.preferencias;

  // Avisos de mensagem nova (respeitam as preferências do convidado)
  const tabRef = React.useRef(tab);
  tabRef.current = tab;
  const prefsRef = React.useRef(prefs);
  prefsRef.current = prefs;
  const hostName = perfil?.anfitriao?.nome || 'o morador';

  const onIncoming = useCallback(() => {
    if (prefsRef.current?.somNotificacao) playBeep();
    if (prefsRef.current?.avisoVisual && tabRef.current !== 'chat') {
      showToast(`Nova mensagem de ${hostName.split(' ')[0]}.`);
    }
  }, [hostName, showToast]);

  const chat = useGuestChat({ onIncoming });

  const qrcodes = useMemo(
    () => (data.data?.qrcodes ?? []).map((q) => ({ ...q, status: getQrStatus(q, now) })),
    [data.data, now]
  );
  const hasActiveQr = qrcodes.some((q) => q.status === 'ativo');

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [tab]);

  const quickMessage = async (text, confirmation) => {
    try {
      await chat.send(text);
      showToast(confirmation);
    } catch (err) {
      showToast({ text: err.message || 'Não foi possível enviar o aviso.', type: 'error' });
    }
  };
  const handleArrive = () => quickMessage(ARRIVAL_MESSAGE, 'Aviso de chegada enviado ao morador.');
  const handleRenew = () => quickMessage(RENEWAL_MESSAGE, 'Pedido de mais tempo enviado ao morador.');

  const handlePrefs = async (patch) => {
    const next = await updatePreferencias(patch);
    data.setData((d) => ({ ...d, perfil: { ...d.perfil, preferencias: next } }));
  };

  const handleReset = async () => {
    await resetarDemonstracao();
    await data.reload();
    showToast('Dados de demonstração restaurados.');
  };

  const handleLogout = () => {
    clearSession();
    navigate('/', { replace: true });
  };

  const renderTab = () => {
    if (data.loading) return <div className="rounded-xl border border-white/[0.08] bg-brand-800"><TableSkeleton rows={5} /></div>;
    if (data.error) return <div className="rounded-xl border border-white/[0.08] bg-brand-800"><ErrorState error={data.error} onRetry={data.reload} /></div>;

    switch (tab) {
      case 'entradas':
        return <EntriesTab entradas={data.data.entradas} qrcodes={qrcodes} now={now} />;
      case 'chat':
        return <ChatTab chat={chat} host={perfil.anfitriao} now={now} />;
      case 'perfil':
        return <ProfileTab perfil={perfil} onPrefs={handlePrefs} onLogout={handleLogout} onReset={handleReset} />;
      default:
        return <QrCodesTab qrcodes={qrcodes} now={now} onToast={showToast} onArrive={handleArrive} onRenew={handleRenew} />;
    }
  };

  return (
    <div className="min-h-screen bg-brand-900 font-sans text-slate-400 antialiased selection:bg-accent selection:text-white">
      <GuestHeader
        perfil={perfil}
        userName={session?.user?.name || 'Convidado'}
        hasActiveQr={hasActiveQr}
        activeTab={tab}
        onTab={setTab}
        unread={chat.unread}
        onLogout={handleLogout}
      />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6" role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {renderTab()}
        <p className="mt-12 text-center text-xs text-slate-600">MainPass © {new Date().getFullYear()} — Controle de Acesso</p>
      </main>

      <Toast message={toast} />
    </div>
  );
}
