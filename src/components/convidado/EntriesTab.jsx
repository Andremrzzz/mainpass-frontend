import React, { useMemo, useState } from 'react';
import Badge from '../ui/Badge';
import { EmptyState } from '../ui/States';
import { ENTRY_FILTERS, ENTRY_STATUS } from '../../constants/convidado';
import { FOCUS_RING } from '../../constants/dashboard';
import { fmtDate, fmtShort } from '../../utils/format';
import { timeAgo } from '../../utils/dates';
import { maskToken } from '../../utils/convidado';

function Summary({ icon, label, value, note, testId }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-brand-800 p-5 shadow-card">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-brand-700 text-sm text-slate-300">
          <i className={`fas ${icon}`}></i>
        </div>
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
      </div>
      <p className="mt-4 text-2xl font-semibold tracking-tight text-slate-100" data-testid={testId}>{value}</p>
      <p className="mt-1 text-xs text-slate-500">{note}</p>
    </div>
  );
}

/**
 * Aba "Minhas Entradas": resumo + histórico de tentativas de acesso.
 * Props: entradas, qrcodes (com status calculado), now
 */
export default function EntriesTab({ entradas, qrcodes, now }) {
  const [filter, setFilter] = useState('todas');

  const sorted = useMemo(() => [...entradas].sort((a, b) => b.timestamp - a.timestamp), [entradas]);
  const authorized = sorted.filter((e) => e.status === 'autorizada');
  const last = authorized[0];
  const released = qrcodes.filter((q) => q.status === 'ativo' || q.status === 'agendado').length;
  const visible = filter === 'todas' ? sorted : sorted.filter((e) => e.status === filter);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Summary icon="fa-door-open" label="Total de entradas" value={authorized.length} note={`${sorted.length} tentativa${sorted.length === 1 ? '' : 's'} registrada${sorted.length === 1 ? '' : 's'}`} testId="sum-total" />
        <Summary icon="fa-clock-rotate-left" label="Última entrada" value={last ? fmtShort(last.timestamp) : '—'} note={last ? `${timeAgo(last.timestamp, now)} · ${last.ambiente}` : 'Nenhuma entrada ainda'} testId="sum-last" />
        <Summary icon="fa-ticket" label="Próximos acessos" value={released} note={released === 1 ? 'QR Code liberado' : 'QR Codes liberados'} testId="sum-next" />
      </div>

      <section className="overflow-hidden rounded-xl border border-white/[0.08] bg-brand-800 shadow-card" aria-label="Histórico de acessos">
        <div className="flex flex-col gap-3 border-b border-white/[0.08] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <h2 className="text-base font-semibold text-slate-100">Histórico de acessos</h2>
          <div role="group" aria-label="Filtrar por status" className="flex flex-wrap gap-1.5">
            {ENTRY_FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                aria-pressed={filter === f.key}
                onClick={() => setFilter(f.key)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-200 ${FOCUS_RING} ${
                  filter === f.key ? 'border-accent-muted/40 bg-accent/15 text-slate-100' : 'border-white/[0.08] text-slate-400 hover:border-white/20 hover:text-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {visible.length === 0 ? (
          <EmptyState
            icon="fa-door-closed"
            title={filter === 'todas' ? 'Nenhuma entrada registrada ainda' : 'Nenhum registro neste filtro'}
            text={filter === 'todas' ? 'Quando você passar pela portaria, o registro aparecerá aqui.' : 'Tente outro filtro.'}
          />
        ) : (
          <ul className="divide-y divide-white/[0.06]" data-testid="entries-list">
            {visible.map((e) => {
              const st = ENTRY_STATUS[e.status];
              return (
                <li key={e.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:gap-6 sm:px-6" data-status={e.status}>
                  <div className="flex items-center gap-3 sm:w-44 sm:shrink-0">
                    <i className={`fas ${st.icon} text-sm ${e.status === 'autorizada' ? 'text-emerald-400' : e.status === 'negada' ? 'text-rose-400' : 'text-amber-400'}`}></i>
                    <span className="text-sm text-slate-200">{fmtDate(e.timestamp)}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-100">{e.ambiente}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {e.motivo || 'Acesso liberado pela portaria'} · <span className="font-mono">{maskToken(e.codigo)}</span>
                    </p>
                  </div>
                  <Badge tone={st.tone}>{st.label}</Badge>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
