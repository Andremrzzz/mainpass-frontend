import React, { useMemo, useState } from 'react';
import NextAccessCard from './NextAccessCard';
import QrCard from './QrCard';
import QrFullscreenModal from './QrFullscreenModal';
import { EmptyState } from '../ui/States';
import { QR_FILTERS } from '../../constants/convidado';
import { FOCUS_RING } from '../../constants/dashboard';

/**
 * Aba "Meus QR Codes".
 * Props: qrcodes (com `status` calculado), now, onToast, onArrive, onRenew
 */
export default function QrCodesTab({ qrcodes, now, onToast, onArrive, onRenew }) {
  const [filter, setFilter] = useState('todos');
  const [openId, setOpenId] = useState(null);

  const counts = useMemo(
    () => Object.fromEntries(QR_FILTERS.map((f) => [f.key, qrcodes.filter((q) => f.match(q.status)).length])),
    [qrcodes]
  );

  const active = useMemo(
    () => qrcodes.filter((q) => q.status === 'ativo').sort((a, b) => a.validUntil - b.validUntil)[0] ?? null,
    [qrcodes]
  );
  const upcoming = useMemo(
    () => qrcodes.filter((q) => q.status === 'agendado').sort((a, b) => a.validFrom - b.validFrom)[0] ?? null,
    [qrcodes]
  );

  const current = QR_FILTERS.find((f) => f.key === filter) ?? QR_FILTERS[0];
  // Ativos primeiro, depois do mais recente para o mais antigo
  const order = { ativo: 0, agendado: 1 };
  const visible = qrcodes
    .filter((q) => current.match(q.status))
    .sort((a, b) => (order[a.status] ?? 2) - (order[b.status] ?? 2) || b.validFrom - a.validFrom);

  const opened = qrcodes.find((q) => q.id === openId && q.status === 'ativo') ?? null;

  return (
    <div className="space-y-6">
      <NextAccessCard active={active} upcoming={upcoming} now={now} onOpenQr={(qr) => setOpenId(qr.id)} onArrive={onArrive} onRenew={onRenew} />

      <section aria-label="Lista de QR Codes">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-semibold text-slate-100">Meus QR Codes</h2>
          <div role="group" aria-label="Filtrar por status" className="flex flex-wrap gap-1.5">
            {QR_FILTERS.map((f) => {
              const selected = filter === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setFilter(f.key)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-200 ${FOCUS_RING} ${
                    selected
                      ? 'border-accent-muted/40 bg-accent/15 text-slate-100'
                      : 'border-white/[0.08] text-slate-400 hover:border-white/20 hover:text-slate-200'
                  }`}
                >
                  {f.label} <span className="ml-0.5 text-slate-500">{counts[f.key]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="mt-4 rounded-xl border border-white/[0.08] bg-brand-800">
            <EmptyState
              icon="fa-qrcode"
              title={filter === 'todos' ? 'Você ainda não tem QR Codes' : 'Nenhum QR Code neste filtro'}
              text={filter === 'todos' ? 'Quando o morador liberar seu acesso, o QR Code aparecerá aqui.' : 'Tente outro filtro para ver os demais.'}
            />
          </div>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {visible.map((qr) => (
              <QrCard key={qr.id} qr={qr} now={now} onOpen={(q) => setOpenId(q.id)} onToast={onToast} />
            ))}
          </div>
        )}
      </section>

      {opened && <QrFullscreenModal qr={opened} now={now} onClose={() => setOpenId(null)} onToast={onToast} />}
    </div>
  );
}
