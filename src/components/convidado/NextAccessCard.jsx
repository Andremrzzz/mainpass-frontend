import React from 'react';
import { btnPrimary, btnSecondary } from '../../constants/ui';
import { fmtShort, fmtRemaining } from '../../utils/format';
import { qrProgress } from '../../utils/convidado';

const STEPS = [
  'Abra este QR Code e aumente o brilho da tela.',
  'Aproxime o celular do leitor da portaria.',
  'Aguarde a liberação e siga as orientações do porteiro.',
];

/**
 * Card em destaque do topo de "Meus QR Codes":
 *  - há QR válido agora      -> tempo restante + instruções + avisar chegada
 *  - só há QR agendado       -> quando começa
 *  - nada utilizável         -> pedir renovação ao morador
 *
 * Props: active (QR ativo mais próximo de expirar), upcoming (próximo agendado),
 *        now, onOpenQr(qr), onArrive(), onRenew()
 */
export default function NextAccessCard({ active, upcoming, now, onOpenQr, onArrive, onRenew }) {
  if (active) {
    const progress = qrProgress(active, now);
    return (
      <section
        className="rounded-xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/[0.08] to-brand-800 p-5 shadow-card sm:p-6"
        aria-label="Próximo acesso"
        data-testid="next-access"
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60 motion-reduce:animate-none"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400"></span>
              </span>
              Acesso liberado agora
            </p>
            <h2 className="mt-2 text-xl font-semibold text-slate-100">{active.ambiente}</h2>
            <p className="mt-1 text-sm text-slate-400">
              {active.local} · {fmtRemaining(active.validUntil - now)} · até {fmtShort(active.validUntil)}
            </p>

            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.06]" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Tempo de validade consumido">
              <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${progress}%` }}></div>
            </div>

            <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
              <button type="button" onClick={() => onOpenQr(active)} className={btnPrimary}>
                <i className="fas fa-expand text-xs"></i>
                Abrir QR Code
              </button>
              <button type="button" onClick={onArrive} className={btnSecondary}>
                <i className="fas fa-location-dot text-xs"></i>
                Avisar que cheguei
              </button>
              <button type="button" onClick={onRenew} className={btnSecondary}>
                <i className="fas fa-clock-rotate-left text-xs"></i>
                Pedir mais tempo
              </button>
            </div>
          </div>

          <div className="lg:w-80">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Como passar na portaria</p>
            <ol className="mt-3 space-y-3">
              {STEPS.map((s, i) => (
                <li key={s} className="flex gap-3 text-sm text-slate-300">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/15 text-[11px] font-medium text-slate-300">
                    {i + 1}
                  </span>
                  {s}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-white/[0.08] bg-brand-800 p-5 shadow-card sm:p-6" aria-label="Próximo acesso" data-testid="next-access">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-brand-700 text-slate-400">
            <i className={`fas ${upcoming ? 'fa-calendar-check' : 'fa-lock'}`}></i>
          </div>
          <div>
            {upcoming ? (
              <>
                <h2 className="text-base font-semibold text-slate-100">Seu próximo acesso ainda não começou</h2>
                <p className="mt-1 text-sm text-slate-400">
                  {upcoming.ambiente} · libera em {fmtShort(upcoming.validFrom)} e vale até {fmtShort(upcoming.validUntil)}.
                </p>
              </>
            ) : (
              <>
                <h2 className="text-base font-semibold text-slate-100">Nenhum QR Code válido no momento</h2>
                <p className="mt-1 text-sm text-slate-400">Peça ao morador para liberar ou renovar seu acesso.</p>
              </>
            )}
          </div>
        </div>
        <button type="button" onClick={onRenew} className={btnSecondary}>
          <i className="fas fa-clock-rotate-left text-xs"></i>
          Solicitar renovação
        </button>
      </div>
    </section>
  );
}
