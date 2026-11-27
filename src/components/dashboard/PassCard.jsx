import React from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import StatusBadge from './StatusBadge';
import { FOCUS_RING, STATUS } from '../../constants/dashboard';
import { fmtDate, fmtRemaining, fmtShort } from '../../utils/format';
import { getProgress, getQrValue } from '../../utils/passes';

/**
 * Card de um passe de acesso (clicável, abre o QrModal).
 *
 * Props:
 *  - pass:   passe com `status` já calculado
 *  - now:    timestamp atual (para o contador de validade)
 *  - onOpen: chamado ao clicar no card
 */
export default function PassCard({ pass, now, onOpen }) {
  const isValid = pass.status === 'valido';
  const isExpired = pass.status === 'expirado';

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`group flex flex-col rounded-xl border border-white/[0.08] bg-brand-800 p-6 text-left shadow-card transition-all duration-200 ease-out hover:border-white/[0.16] hover:bg-brand-700/60 ${FOCUS_RING} ${
        isExpired ? 'opacity-75' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <StatusBadge status={pass.status} />
        <span className="font-mono text-xs text-slate-500">{pass.id}</span>
      </div>

      <div className="mt-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-base font-semibold leading-snug text-slate-100">{pass.unit}</h3>
          <p className="mt-1.5 truncate text-sm text-slate-400">{pass.guest.name}</p>
          <p className="mt-0.5 truncate text-xs text-slate-500">Anfitrião: {pass.host}</p>
        </div>

        {/* Prévia do QR: só desenhada quando o convite está aprovado e válido */}
        <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white p-1.5">
          {isValid ? (
            <QRCodeCanvas value={getQrValue(pass)} size={120} level="M" style={{ width: '100%', height: '100%', display: 'block' }} />
          ) : (
            <i className={`fas ${pass.status === 'pendente' ? 'fa-hourglass-half' : 'fa-lock'} text-sm text-slate-500`}></i>
          )}
        </div>
      </div>

      <div className="mt-6 border-t border-white/[0.06] pt-4">
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="text-slate-500">Validade</span>
          <span className="text-slate-300">
            {fmtShort(pass.validFrom)} – {fmtShort(pass.validUntil)}
          </span>
        </div>

        {pass.status === 'pendente' && <p className="mt-3 text-xs font-medium text-amber-400">Aguardando aprovação da portaria</p>}
        {pass.status === 'recusado' && (
          <p className="mt-3 text-xs text-rose-400">Recusado pela portaria{pass.motivoRecusa ? `: ${pass.motivoRecusa}` : ''}</p>
        )}

        {isValid && (
          <div className="mt-3">
            <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className={`h-full rounded-full ${STATUS.valido.bar}`}
                style={{ width: `${getProgress(pass, now)}%` }}
              ></div>
            </div>
            <p className="mt-2 text-xs text-slate-500">{fmtRemaining(pass.validUntil - now)}</p>
          </div>
        )}
        {pass.status === 'pendente' && (
          <p className="mt-3 text-xs text-slate-500">QR Code liberado após a aprovação do porteiro.</p>
        )}
        {isExpired && (
          <p className="mt-3 text-xs text-slate-500">Encerrado em {fmtDate(pass.validUntil)}.</p>
        )}
      </div>
    </button>
  );
}
