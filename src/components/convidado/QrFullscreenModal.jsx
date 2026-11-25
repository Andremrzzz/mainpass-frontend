import React, { useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import useEscapeKey from '../../hooks/useEscapeKey';
import useBodyScrollLock from '../../hooks/useBodyScrollLock';
import { FOCUS_RING } from '../../constants/dashboard';
import { btnSecondary } from '../../constants/ui';
import { fmtRemaining, fmtShort } from '../../utils/format';
import { copyText, downloadQrCanvas } from '../../utils/convidado';

/**
 * QR Code em tela cheia, com fundo escuro e QR grande sobre branco
 * (contraste máximo para o leitor da portaria). Fecha com ESC ou no botão.
 */
export default function QrFullscreenModal({ qr, now, onClose, onToast }) {
  const wrapRef = useRef(null);
  useEscapeKey(onClose);
  useBodyScrollLock(true);

  const handleCopy = async () => {
    const ok = await copyText(qr.token);
    onToast(ok ? 'Código copiado.' : { text: 'Não foi possível copiar o código.', type: 'error' });
  };

  const handleDownload = () => {
    const ok = downloadQrCanvas(wrapRef.current?.querySelector('canvas'), `mainpass-${qr.id}.png`);
    onToast(ok ? 'QR Code salvo no seu dispositivo.' : { text: 'Não foi possível salvar o QR Code.', type: 'error' });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex animate-fade flex-col items-center justify-center overflow-y-auto bg-black px-4 py-6 motion-reduce:animate-none"
      role="dialog"
      aria-modal="true"
      aria-label="QR Code ampliado"
      data-testid="qr-fullscreen"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar"
        className={`absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-slate-300 transition-colors duration-200 hover:bg-white/10 hover:text-white ${FOCUS_RING}`}
      >
        <i className="fas fa-xmark"></i>
      </button>

      <p className="text-xs font-medium uppercase tracking-wider text-emerald-400">Apresente este código na portaria</p>
      <h2 className="mt-2 text-center text-lg font-semibold text-slate-100">{qr.ambiente}</h2>
      <p className="mt-0.5 text-center text-sm text-slate-400">{qr.local}</p>

      <div ref={wrapRef} className="mt-6 rounded-2xl bg-white p-5">
        <QRCodeCanvas value={qr.token} size={640} level="H" style={{ width: 'min(76vw, 52vh, 420px)', height: 'min(76vw, 52vh, 420px)', display: 'block' }} />
      </div>

      <p className="mt-5 font-mono text-base tracking-widest text-slate-200" data-testid="qr-fullscreen-token">
        {qr.token}
      </p>
      <p className="mt-1.5 text-center text-sm text-slate-400">
        {fmtRemaining(qr.validUntil - now)} · válido até {fmtShort(qr.validUntil)}
      </p>
      <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
        <i className="fas fa-sun"></i>
        Aumente o brilho da tela para facilitar a leitura.
      </p>

      <div className="mt-6 flex flex-wrap justify-center gap-2.5">
        <button type="button" onClick={handleCopy} className={btnSecondary}>
          <i className="fas fa-copy text-xs"></i>
          Copiar código
        </button>
        <button type="button" onClick={handleDownload} className={btnSecondary}>
          <i className="fas fa-download text-xs"></i>
          Salvar imagem
        </button>
      </div>
    </div>
  );
}
