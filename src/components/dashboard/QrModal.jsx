import React, { useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import StatusBadge from './StatusBadge';
import useEscapeKey from '../../hooks/useEscapeKey';
import { FOCUS_RING, STATUS } from '../../constants/dashboard';
import { fmtDate, fmtRemaining, maskCpf } from '../../utils/format';
import { getProgress, getQrValue } from '../../utils/passes';

/**
 * Modal com o QR Code ampliado, validade, dados do convidado e ações.
 *
 * Props:
 *  - pass:    passe com `status` já calculado
 *  - now:     timestamp atual
 *  - onClose: fecha o modal
 *  - onToast: exibe uma mensagem temporária (ex.: após salvar o QR)
 */
export default function QrModal({ pass, now, onClose, onToast }) {
  const qrWrapRef = useRef(null);
  const status = pass.status;
  const isActive = status === 'valido';

  useEscapeKey(onClose);

  // Barra de progresso: expirado = cheia, pendente = vazia
  const progress = status === 'expirado' ? 100 : status === 'pendente' ? 0 : getProgress(pass, now);
  const remaining = status === 'pendente' ? 'Aguardando aprovação' : fmtRemaining(pass.validUntil - now);

  const handleDownload = () => {
    const src = qrWrapRef.current?.querySelector('canvas');
    if (!src) return;

    // Gera a imagem com margem branca para facilitar a leitura
    const margin = 40;
    const out = document.createElement('canvas');
    out.width = src.width + margin * 2;
    out.height = src.height + margin * 2;
    const ctx = out.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(src, margin, margin);

    const link = document.createElement('a');
    link.download = `mainpass-${pass.id}.png`;
    link.href = out.toDataURL('image/png');
    link.click();
    onToast('QR Code salvo no seu dispositivo.');
  };

  const handleWhatsApp = () => {
    const msg =
      `Olá, ${pass.guest.name.split(' ')[0]}! Seu acesso ao ${pass.unit} (MainPass) está liberado.\n` +
      `Código: ${pass.code}\n` +
      `Válido de ${fmtDate(pass.validFrom)} até ${fmtDate(pass.validUntil)}.\n` +
      `Apresente o QR Code na portaria.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
  };

  const details = [
    { label: 'Nome completo', value: pass.guest.name },
    { label: 'CPF', value: maskCpf(pass.guest.cpf), mono: true },
    { label: 'E-mail', value: pass.guest.email },
    { label: 'Telefone', value: pass.guest.phone },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Detalhes do acesso ${pass.id}`}
    >
      <div
        className="absolute inset-0 animate-fade bg-black/60 backdrop-blur-sm motion-reduce:animate-none"
        onClick={onClose}
      ></div>

      <div className="relative max-h-[92vh] w-full animate-pop overflow-y-auto rounded-t-2xl border border-white/[0.08] bg-brand-800 shadow-overlay motion-reduce:animate-none sm:max-w-lg sm:rounded-xl">
        {/* Cabeçalho */}
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-white/[0.08] bg-brand-800 px-6 py-5">
          <div className="min-w-0">
            <StatusBadge status={status} />
            <h3 className="mt-3 text-lg font-semibold leading-snug text-slate-100">{pass.unit}</h3>
            <p className="mt-1 text-sm text-slate-400">Anfitrião: {pass.host}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-500 transition-colors duration-200 hover:bg-white/[0.06] hover:text-slate-200 ${FOCUS_RING}`}
            aria-label="Fechar"
          >
            <i className="fas fa-xmark"></i>
          </button>
        </div>

        <div className="space-y-6 px-6 py-6">
          {/* QR Code */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <div
                ref={qrWrapRef}
                className={`rounded-xl border border-white/10 bg-white p-4 transition-all duration-200 ${
                  isActive ? '' : 'select-none opacity-40 blur-md'
                }`}
              >
                <QRCodeCanvas
                  value={getQrValue(pass)}
                  size={360}
                  level="H"
                  style={{ width: 208, height: 208, display: 'block' }}
                />
              </div>

              {!isActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-brand-900 text-slate-300">
                    <i className={`fas ${status === 'pendente' ? 'fa-hourglass-half' : 'fa-lock'}`}></i>
                  </div>
                  <p className="mt-3 text-sm font-medium text-slate-100">
                    {status === 'pendente' ? 'Aguardando aprovação' : 'Acesso expirado'}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">QR Code indisponível</p>
                </div>
              )}
            </div>
            <p className="mt-4 font-mono text-xs tracking-widest text-slate-500">{pass.code}</p>
          </div>

          {/* Validade */}
          <section>
            <h4 className="text-xs font-medium uppercase tracking-wider text-slate-500">Validade</h4>
            <div className="mt-3 rounded-lg border border-white/[0.08] bg-brand-900/50 p-4">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-slate-400">{remaining}</span>
                <span className={`font-medium ${isActive ? 'text-slate-100' : 'text-slate-500'}`}>
                  {progress}%
                </span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${STATUS[status].bar}`}
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-xs text-slate-500">Início</dt>
                  <dd className="mt-1 text-slate-200">{fmtDate(pass.validFrom)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Expira em</dt>
                  <dd className="mt-1 text-slate-200">{fmtDate(pass.validUntil)}</dd>
                </div>
              </dl>
            </div>
          </section>

          {/* Dados do convidado */}
          <section>
            <h4 className="text-xs font-medium uppercase tracking-wider text-slate-500">Dados do convidado</h4>
            <dl className="mt-1 divide-y divide-white/[0.06]">
              {details.map((d) => (
                <div key={d.label} className="flex items-center justify-between gap-4 py-3">
                  <dt className="text-sm text-slate-500">{d.label}</dt>
                  <dd className={`break-all text-right text-sm text-slate-200 ${d.mono ? 'font-mono' : ''}`}>
                    {d.value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          {/* Ações */}
          <div className="space-y-2.5 pt-1">
            <button
              type="button"
              onClick={handleDownload}
              disabled={!isActive}
              className={`flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-accent text-sm font-medium text-white shadow-card transition-colors duration-200 hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING}`}
            >
              <i className="fas fa-download text-xs"></i>
              Baixar / Salvar QR Code
            </button>
            <button
              type="button"
              onClick={handleWhatsApp}
              disabled={!isActive}
              className={`flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-transparent text-sm font-medium text-slate-200 transition-colors duration-200 hover:border-white/20 hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING}`}
            >
              <i className="fab fa-whatsapp text-base text-emerald-400"></i>
              Compartilhar via WhatsApp
            </button>
            <button
              type="button"
              onClick={onClose}
              className={`h-10 w-full rounded-lg text-sm font-medium text-slate-400 transition-colors duration-200 hover:text-slate-200 ${FOCUS_RING}`}
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
