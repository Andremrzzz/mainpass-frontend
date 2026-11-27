import React, { useEffect, useState } from 'react';
import PageHeader from '../ui/PageHeader';
import { EmptyState, ErrorState, TableSkeleton } from '../ui/States';
import useNow from '../../hooks/useNow';
import { aprovarSolicitacao, recusarSolicitacao } from '../../services/portariaService';
import { btnDanger, btnPrimary, btnSecondary, inputBase, inputOk } from '../../constants/ui';
import { fmtDateTime } from '../../utils/dates';
import { fmtRemaining, maskCpf } from '../../utils/format';
import { formatPhone } from '../../utils/masks';

const MOTIVO_MAX = 255;

/**
 * Fila de solicitações de convite: o QR Code só é liberado ao convidado depois que
 * a portaria aprova. A lista vem do Portaria (para o contador do menu) e é atualizada
 * por polling; ao decidir, o item sai da fila na hora e a lista é recarregada.
 */
export default function RequestsTab({ onToast, requests }) {
  const now = useNow(30000);
  const [busyId, setBusyId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [reason, setReason] = useState('');

  const items = requests.data ?? [];

  // Ao abrir a tela, busca a fila na hora (o Portaria só atualiza a cada 10 s)
  const { refresh } = requests;
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finish = (id, message) => {
    requests.setData((list) => (list ?? []).filter((r) => r.id !== id));
    setRejectingId(null);
    setReason('');
    onToast(message);
    requests.refresh();
  };

  const fail = (err) => {
    onToast({ text: err.message || 'Não foi possível concluir a ação.', type: 'error' });
    if (err.status === 409 || err.status === 404) requests.refresh(); // já decidida/expirada: atualiza a fila
  };

  const approve = async (r) => {
    if (busyId) return;
    setBusyId(r.id);
    try {
      await aprovarSolicitacao(r.id);
      finish(r.id, `Convite de ${r.guestName} aprovado. O QR Code foi liberado.`);
    } catch (err) {
      fail(err);
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (r) => {
    if (busyId) return;
    setBusyId(r.id);
    try {
      await recusarSolicitacao(r.id, reason.trim());
      finish(r.id, `Convite de ${r.guestName} recusado.`);
    } catch (err) {
      fail(err);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Solicitações de convite"
        description="Convites criados pelos moradores aguardam sua aprovação. O QR Code só é liberado ao convidado depois de aprovado."
      />

      {requests.refreshError && !requests.loading && !requests.error && (
        <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3.5 py-3 text-sm text-amber-200" data-testid="refresh-error">
          <i className="fas fa-triangle-exclamation mt-0.5 text-xs"></i>
          <span>Não foi possível atualizar a fila: {requests.refreshError.message || 'erro de comunicação'}. Exibindo os últimos dados carregados.</span>
        </div>
      )}

      <section aria-label="Fila de solicitações">
        {requests.loading ? (
          <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-brand-800">
            <TableSkeleton rows={3} />
          </div>
        ) : requests.error ? (
          <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-brand-800">
            <ErrorState error={requests.error} onRetry={requests.reload} />
          </div>
        ) : items.length === 0 ? (
          <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-brand-800">
            <EmptyState icon="fa-user-check" title="Nenhuma solicitação pendente" text="Quando um morador criar um convite, ele aparecerá aqui para aprovação." />
          </div>
        ) : (
          <>
            <p className="mb-4 text-xs text-slate-500" aria-live="polite">
              {requests.refreshError
                ? 'Falha ao atualizar. Exibindo os últimos dados carregados.'
                : `${items.length} solicitaç${items.length === 1 ? 'ão aguardando' : 'ões aguardando'} decisão · atualiza automaticamente`}
            </p>
            <ul className="grid gap-4 lg:grid-cols-2" data-testid="request-list">
              {items.map((r) => {
                const busy = busyId === r.id;
                const rejecting = rejectingId === r.id;
                const details = [
                  ['Morador', `${r.host}${r.unit && r.unit !== '—' ? ` · ${r.unit}` : ''}`],
                  ['Ambiente', r.ambiente || '—'],
                  ['Início', fmtDateTime(r.validFrom)],
                  ['Expira em', `${fmtDateTime(r.validUntil)} (${fmtRemaining(r.validUntil - now)})`],
                  ['Usos', `${r.usosMax}`],
                  ['Solicitado em', r.criadoEm ? fmtDateTime(r.criadoEm) : '—'],
                ];
                return (
                  <li key={r.id} className="rounded-xl border border-amber-500/20 bg-brand-800 p-5 shadow-card" data-testid="request-card">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-semibold text-slate-100">{r.guestName}</h3>
                        <p className="mt-0.5 font-mono text-xs text-slate-500">{maskCpf(r.guestCpf)}</p>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-400 ring-1 ring-inset ring-amber-500/20">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400"></span>
                        Aguardando
                      </span>
                    </div>

                    <dl className="mt-4 divide-y divide-white/[0.06] border-t border-white/[0.06] text-sm">
                      {details.map(([label, value]) => (
                        <div key={label} className="grid grid-cols-3 gap-3 py-2">
                          <dt className="text-slate-500">{label}</dt>
                          <dd className="col-span-2 text-slate-200">{value}</dd>
                        </div>
                      ))}
                      {(r.guestEmail || r.guestPhone) && (
                        <div className="grid grid-cols-3 gap-3 py-2">
                          <dt className="text-slate-500">Contato</dt>
                          <dd className="col-span-2 break-all text-slate-200">
                            {[r.guestEmail, r.guestPhone ? formatPhone(r.guestPhone) : ''].filter(Boolean).join(' · ')}
                          </dd>
                        </div>
                      )}
                      {r.observacao && (
                        <div className="grid grid-cols-3 gap-3 py-2">
                          <dt className="text-slate-500">Observações</dt>
                          <dd className="col-span-2 text-slate-200">{r.observacao}</dd>
                        </div>
                      )}
                    </dl>

                    {rejecting ? (
                      <div className="mt-4 space-y-3 rounded-lg border border-rose-500/20 bg-rose-500/5 p-3">
                        <label htmlFor={`reason-${r.id}`} className="block text-sm font-medium text-slate-200">
                          Motivo da recusa <span className="font-normal text-slate-500">(opcional, o morador poderá ver)</span>
                        </label>
                        <textarea
                          id={`reason-${r.id}`}
                          value={reason}
                          onChange={(e) => setReason(e.target.value.slice(0, MOTIVO_MAX))}
                          rows={2}
                          disabled={busy}
                          className={`${inputBase} ${inputOk} h-auto py-2.5`}
                          placeholder="Ex.: documento não confere"
                        />
                        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                          <button type="button" onClick={() => setRejectingId(null)} disabled={busy} className={btnSecondary}>
                            Voltar
                          </button>
                          <button type="button" onClick={() => reject(r)} disabled={busy} className={btnDanger} data-testid="reject-confirm">
                            {busy ? <i className="fas fa-circle-notch fa-spin text-xs"></i> : <i className="fas fa-ban text-xs"></i>}
                            Confirmar recusa
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <button
                          type="button"
                          onClick={() => { setRejectingId(r.id); setReason(''); }}
                          disabled={Boolean(busyId)}
                          className={btnDanger}
                          data-testid="reject-btn"
                        >
                          <i className="fas fa-xmark text-xs"></i>
                          Recusar
                        </button>
                        <button type="button" onClick={() => approve(r)} disabled={Boolean(busyId)} className={btnPrimary} data-testid="approve-btn">
                          {busy ? <i className="fas fa-circle-notch fa-spin text-xs"></i> : <i className="fas fa-check text-xs"></i>}
                          Aprovar
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
