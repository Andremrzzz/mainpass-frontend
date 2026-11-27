import React, { useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import Badge from '../ui/Badge';
import { QR_STATUS } from '../../constants/convidado';
import { btnIcon, btnSecondary } from '../../constants/ui';
import { fmtShort, fmtRemaining } from '../../utils/format';
import { copyText, downloadQrCanvas, maskToken, qrProgress } from '../../utils/convidado';

const PLACEHOLDER_ICON = { agendado: 'fa-hourglass-half', usado: 'fa-check', expirado: 'fa-clock', cancelado: 'fa-ban', pendente: 'fa-hourglass-half', recusado: 'fa-ban' };

/**
 * Card de um QR Code do convidado. O QR real só é desenhado quando ativo;
 * nos demais estados mostra um ícone (evita uso indevido de um código inválido).
 * `qr.status` deve vir calculado (getQrStatus).
 */
export default function QrCard({ qr, now, onOpen, onToast }) {
  const wrapRef = useRef(null);
  const status = qr.status;
  const active = status === 'ativo';
  const meta = QR_STATUS[status];
  const dim = !active && status !== 'agendado';

  const handleCopy = async () => {
    const ok = await copyText(qr.token);
    onToast(ok ? 'Código copiado.' : { text: 'Não foi possível copiar o código.', type: 'error' });
  };

  const handleDownload = () => {
    const ok = downloadQrCanvas(wrapRef.current?.querySelector('canvas'), `mainpass-${qr.id}.png`);
    onToast(ok ? 'QR Code salvo no seu dispositivo.' : { text: 'Não foi possível salvar o QR Code.', type: 'error' });
  };

  const timeNote =
    status === 'pendente'
      ? 'Aguardando aprovação da portaria. O QR Code será liberado após a aprovação.'
      : status === 'recusado'
        ? `Recusado pela portaria${qr.motivoRecusa ? `: ${qr.motivoRecusa}` : ''}`
        : status === 'ativo'
      ? fmtRemaining(qr.validUntil - now)
      : status === 'agendado'
        ? `Libera em ${fmtShort(qr.validFrom)}`
        : status === 'usado'
          ? 'Todos os usos consumidos'
          : status === 'cancelado'
            ? 'Cancelado pelo morador'
            : 'Fora do período de validade';

  return (
    <article
      className={`flex flex-col rounded-xl border bg-brand-800 p-5 shadow-card transition-colors duration-200 ${
        active ? 'border-emerald-500/30' : 'border-white/[0.08]'
      } ${dim ? 'opacity-90' : ''}`}
      data-testid="qr-card"
      data-status={status}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-slate-100">{qr.ambiente}</h3>
          <p className="mt-0.5 truncate text-xs text-slate-500">{qr.local}</p>
        </div>
        <Badge tone={meta.tone}>{meta.label}</Badge>
      </div>

      <div className="mt-4 flex items-center gap-4">
        <div ref={wrapRef} className="shrink-0">
          {active ? (
            <button
              type="button"
              onClick={() => onOpen(qr)}
              aria-label="Ampliar QR Code"
              className="block rounded-lg bg-white p-2 transition-transform duration-200 hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70"
            >
              <QRCodeCanvas value={qr.token} size={320} level="H" style={{ width: 104, height: 104, display: 'block' }} />
            </button>
          ) : (
            <div className="flex h-[120px] w-[120px] items-center justify-center rounded-lg border border-dashed border-white/15 bg-brand-900 text-2xl text-slate-600">
              <i className={`fas ${PLACEHOLDER_ICON[status]}`}></i>
            </div>
          )}
        </div>

        <dl className="min-w-0 flex-1 space-y-2.5 text-sm">
          <div>
            <dt className="text-xs text-slate-500">Início</dt>
            <dd className="text-slate-200">{fmtShort(qr.validFrom)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Expira</dt>
            <dd className="text-slate-200">{fmtShort(qr.validUntil)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Usos</dt>
            <dd className="text-slate-200">
              {qr.usos} de {qr.usosMax}
            </dd>
          </div>
        </dl>
      </div>

      {active && (
        <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/[0.06]">
          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${qrProgress(qr, now)}%` }}></div>
        </div>
      )}
      <p className="mt-3 text-xs text-slate-500">{timeNote}</p>

      <div className="mt-4 flex items-center justify-between gap-2 border-t border-white/[0.06] pt-4">
        <span className="min-w-0 truncate font-mono text-xs tracking-wider text-slate-400" data-testid="qr-token">
          {active || status === 'agendado' ? qr.token : status === 'pendente' || status === 'recusado' ? 'QR Code não liberado' : maskToken(qr.token)}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          <button type="button" onClick={handleCopy} disabled={dim} className={btnIcon} aria-label="Copiar código" title="Copiar código">
            <i className="fas fa-copy text-xs"></i>
          </button>
          <button type="button" onClick={handleDownload} disabled={!active} className={btnIcon} aria-label="Baixar imagem do QR Code" title="Baixar imagem">
            <i className="fas fa-download text-xs"></i>
          </button>
          <button type="button" onClick={() => onOpen(qr)} disabled={!active} className={`${btnSecondary} h-8 px-3 text-xs`}>
            <i className="fas fa-expand text-[11px]"></i>
            Ampliar
          </button>
        </div>
      </div>
    </article>
  );
}
