import React, { useState } from 'react';
import Modal from '../ui/Modal';
import Badge from '../ui/Badge';
import { ErrorState } from '../ui/States';
import useResource from '../../hooks/useResource';
import { getMorador, updateMorador } from '../../services/portariaService';
import { btnDanger, btnPrimary, btnSecondary } from '../../constants/ui';
import { GUEST_STATUS, RESIDENT_STATUS } from '../../constants/portaria';
import { fmtDateTime } from '../../utils/dates';
import { maskCpf } from '../../utils/format';
import { formatCpf, formatPhone } from '../../utils/masks';
import { formatUnit, toResidentPayload } from '../../utils/residents';

/**
 * Detalhes do morador + convidados vinculados à unidade.
 * Carrega GET /api/moradores/{id} e permite bloquear/desbloquear a conta.
 *
 * Props:
 *  - resident:  dados já disponíveis na listagem (exibidos enquanto carrega)
 *  - onClose:   fecha o modal
 *  - onEdit:    (morador) => void — abre o formulário de edição
 *  - onUpdated: (morador, mensagem) => void — após alterar o status
 */
export default function ResidentDetailsModal({ resident, onClose, onEdit, onUpdated }) {
  const detail = useResource(() => getMorador(resident.id), resident.id);
  const data = detail.data ?? resident;
  const guests = detail.data?.convidados;

  const [showCpf, setShowCpf] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  const isActive = data.status === 'ativo';

  const toggleStatus = async () => {
    const next = isActive ? 'bloqueado' : 'ativo';
    setBusy(true);
    setActionError('');
    try {
      const updated = await updateMorador(data.id, { ...toResidentPayload(data), status: next });
      detail.setData((prev) => ({ ...(prev ?? data), ...updated }));
      onUpdated(updated, next === 'ativo' ? 'Conta desbloqueada.' : 'Conta bloqueada.');
      setConfirming(false);
    } catch (err) {
      setActionError(err.message || 'Não foi possível alterar o status.');
    } finally {
      setBusy(false);
    }
  };

  const fields = [
    { label: 'Nome completo', value: data.nome },
    {
      label: 'CPF',
      value: (
        <span className="inline-flex items-center gap-2">
          <span className="font-mono">{showCpf ? formatCpf(data.cpf) : maskCpf(data.cpf)}</span>
          <button
            type="button"
            onClick={() => setShowCpf((v) => !v)}
            className="rounded text-xs font-medium text-accent-muted hover:text-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70"
          >
            {showCpf ? 'Ocultar' : 'Mostrar'}
          </button>
        </span>
      ),
    },
    { label: 'E-mail', value: <span className="break-all">{data.email}</span> },
    { label: 'Telefone', value: formatPhone(data.telefone) },
    { label: 'Unidade / Bloco', value: formatUnit(data) },
    {
      label: 'Status da conta',
      value: <Badge tone={RESIDENT_STATUS[data.status].tone}>{RESIDENT_STATUS[data.status].label}</Badge>,
    },
  ];

  return (
    <Modal
      size="lg"
      title={data.nome}
      subtitle={`Unidade ${formatUnit(data)}`}
      onClose={onClose}
      dismissible={!busy}
      footer={
        confirming ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-300">
              {isActive ? 'Bloquear o acesso deste morador?' : 'Desbloquear a conta deste morador?'}
            </p>
            <div className="flex flex-col-reverse gap-3 sm:flex-row">
              <button type="button" onClick={() => setConfirming(false)} disabled={busy} className={btnSecondary}>
                Cancelar
              </button>
              <button type="button" onClick={toggleStatus} disabled={busy} className={isActive ? btnDanger : btnPrimary}>
                {busy ? <i className="fas fa-circle-notch fa-spin text-xs"></i> : null}
                {isActive ? 'Confirmar bloqueio' : 'Confirmar desbloqueio'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setConfirming(true)} className={isActive ? btnDanger : btnSecondary}>
              <i className={`fas ${isActive ? 'fa-lock' : 'fa-lock-open'} text-xs`}></i>
              {isActive ? 'Bloquear conta' : 'Desbloquear conta'}
            </button>
            <button type="button" onClick={() => onEdit(data)} className={btnPrimary}>
              <i className="fas fa-pen text-xs"></i>
              Editar dados
            </button>
          </div>
        )
      }
    >
      <div className="space-y-8">
        {actionError && (
          <div role="alert" className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3.5 py-3 text-sm text-rose-300">
            {actionError}
          </div>
        )}

        <dl className="divide-y divide-white/[0.06]">
          {fields.map((f) => (
            <div key={f.label} className="grid gap-1 py-3 first:pt-0 sm:grid-cols-3 sm:gap-4">
              <dt className="text-sm text-slate-500">{f.label}</dt>
              <dd className="text-sm text-slate-100 sm:col-span-2">{f.value}</dd>
            </div>
          ))}
        </dl>

        <section>
          <h3 className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Convidados deste morador
          </h3>

          {detail.loading && !guests ? (
            <div role="status" aria-label="Carregando convidados" className="mt-4 space-y-3">
              {[0, 1].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-white/[0.04]"></div>
              ))}
            </div>
          ) : detail.error ? (
            <div className="mt-2 rounded-lg border border-white/[0.08]">
              <ErrorState error={detail.error} onRetry={detail.reload} />
            </div>
          ) : guests && guests.length > 0 ? (
            <ul className="mt-3 divide-y divide-white/[0.06] rounded-lg border border-white/[0.08]">
              {guests.map((g) => (
                <li key={g.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-slate-100">{g.nome}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      <span className="font-mono">{maskCpf(g.cpf)}</span> · válido até {fmtDateTime(g.validade)}
                      {g.ambiente ? ` · ${g.ambiente}` : ''}
                      {g.usosMax ? ` · ${g.usos}/${g.usosMax} uso${g.usosMax === 1 ? '' : 's'}` : ''}
                    </p>
                  </div>
                  <Badge tone={GUEST_STATUS[g.status].tone}>{GUEST_STATUS[g.status].label}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 rounded-lg border border-dashed border-white/[0.12] px-4 py-6 text-center text-sm text-slate-500">
              Este morador ainda não tem convidados.
            </p>
          )}
        </section>
      </div>
    </Modal>
  );
}
