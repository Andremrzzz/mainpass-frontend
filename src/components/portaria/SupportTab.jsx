import React, { useMemo, useState } from 'react';
import PageHeader from '../ui/PageHeader';
import Badge from '../ui/Badge';
import { EmptyState, ErrorState, TableSkeleton } from '../ui/States';
import useResource from '../../hooks/useResource';
import { listChamados, resolverChamado } from '../../services/portariaService';
import { FOCUS_RING } from '../../constants/dashboard';
import { TICKET_STATUS, TICKET_TABS } from '../../constants/portaria';
import { btnSecondary } from '../../constants/ui';
import { fmtDateTime } from '../../utils/dates';

/** Aba 4: caixa de entrada de chamados dos moradores, com ação "Resolvido". */
export default function SupportTab({ onToast }) {
  const tickets = useResource(listChamados, 'tickets', { refreshMs: 30000 });

  const [tab, setTab] = useState('aberto');
  const [resolvingId, setResolvingId] = useState(null);

  const list = tickets.data ?? [];

  const counts = useMemo(
    () => ({
      aberto: list.filter((t) => t.status === 'aberto').length,
      resolvido: list.filter((t) => t.status === 'resolvido').length,
      todos: list.length,
    }),
    [list]
  );

  const visible = useMemo(
    () =>
      list
        .filter((t) => tab === 'todos' || t.status === tab)
        .sort((a, b) => b.criadoEm - a.criadoEm),
    [list, tab]
  );

  const handleResolve = async (ticket) => {
    if (resolvingId) return;
    setResolvingId(ticket.id);
    try {
      const updated = await resolverChamado(ticket.id);
      tickets.setData((prev) => (prev ?? []).map((t) => (t.id === ticket.id ? { ...t, ...updated, status: 'resolvido' } : t)));
      onToast('Chamado marcado como resolvido.');
    } catch (err) {
      onToast({ text: err.message || 'Não foi possível resolver o chamado.', type: 'error' });
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader title="Chamados / Suporte" description="Solicitações enviadas pelos moradores à portaria." />

      <section className="overflow-hidden rounded-xl border border-white/[0.08] bg-brand-800 shadow-card">
        <div className="border-b border-white/[0.08] px-5 py-5 sm:px-6">
          <div
            className="inline-flex w-full rounded-lg border border-white/[0.08] bg-brand-900 p-1 sm:w-auto"
            role="tablist"
            aria-label="Filtrar chamados"
          >
            {TICKET_TABS.map((t) => {
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(t.key)}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-200 sm:flex-none ${FOCUS_RING} ${
                    active ? 'bg-white/[0.08] text-slate-100' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {t.label}
                  <span className={`rounded px-1.5 py-0.5 text-xs ${active ? 'bg-white/[0.08] text-slate-200' : 'text-slate-500'}`}>
                    {counts[t.key]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {tickets.loading ? (
          <TableSkeleton rows={4} />
        ) : tickets.error ? (
          <ErrorState error={tickets.error} onRetry={tickets.reload} />
        ) : visible.length === 0 ? (
          <EmptyState
            icon="fa-headset"
            title={tab === 'aberto' ? 'Nenhum chamado em aberto' : 'Nenhum chamado encontrado'}
            text={tab === 'aberto' ? 'Tudo em dia por aqui.' : undefined}
          />
        ) : (
          <ul className="divide-y divide-white/[0.06]" data-testid="tickets-list">
            {visible.map((t) => {
              const open = t.status === 'aberto';
              const busy = resolvingId === t.id;
              return (
                <li key={t.id} className="flex flex-col gap-4 px-5 py-5 sm:px-6 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <h3 className="text-sm font-medium text-slate-100">{t.assunto}</h3>
                      <Badge tone={TICKET_STATUS[t.status].tone}>{TICKET_STATUS[t.status].label}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {t.morador} · {t.unidade} · {fmtDateTime(t.criadoEm)}
                    </p>
                    <p className="mt-3 text-sm leading-relaxed text-slate-300">{t.mensagem}</p>
                  </div>

                  {open && (
                    <button
                      type="button"
                      onClick={() => handleResolve(t)}
                      disabled={Boolean(resolvingId)}
                      className={`${btnSecondary} shrink-0`}
                    >
                      {busy ? (
                        <i className="fas fa-circle-notch fa-spin text-xs"></i>
                      ) : (
                        <i className="fas fa-check text-xs"></i>
                      )}
                      Marcar como resolvido
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
