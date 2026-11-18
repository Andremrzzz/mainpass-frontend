import React, { useEffect, useMemo, useState } from 'react';
import PageHeader from '../ui/PageHeader';
import SearchInput from '../ui/SearchInput';
import Pagination, { paginate } from '../ui/Pagination';
import { EmptyState, ErrorState, TableSkeleton } from '../ui/States';
import InviteFormModal from './InviteFormModal';
import useNow from '../../hooks/useNow';
import useResource from '../../hooks/useResource';
import { listConvitesAtivos } from '../../services/portariaService';
import { PAGE_SIZE } from '../../constants/portaria';
import { btnIcon, btnPrimary } from '../../constants/ui';
import { fmtDateTime } from '../../utils/dates';
import { fmtRemaining, maskCpf } from '../../utils/format';
import { normalizeText, onlyDigits } from '../../utils/masks';

const REFRESH_MS = 30000;

/** Aba 3: convites (QR Codes) ainda válidos no condomínio, para conferência da portaria. */
export default function InvitesTab({ onToast }) {
  const now = useNow(30000);
  const invites = useResource(listConvitesAtivos, 'invites', { refreshMs: REFRESH_MS });

  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [query]);

  // Convites que expiraram desde a última carga saem da lista
  const filtered = useMemo(() => {
    const q = normalizeText(query.trim());
    const qDigits = onlyDigits(query);
    return (invites.data ?? [])
      .filter((i) => i.validUntil > now)
      .filter((i) => {
        if (!q) return true;
        return (
          normalizeText([i.guestName, i.unit, i.host, i.code].join(' ')).includes(q) ||
          (qDigits.length >= 3 && onlyDigits(i.guestCpf).includes(qDigits))
        );
      })
      .sort((a, b) => a.validUntil - b.validUntil);
  }, [invites.data, query, now]);

  const { rows, page: currentPage } = paginate(filtered, page, PAGE_SIZE);

  const copyCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      onToast('Código copiado.');
    } catch {
      onToast({ text: 'Não foi possível copiar o código.', type: 'error' });
    }
  };

  const CopyButton = ({ code }) => (
    <button type="button" onClick={() => copyCode(code)} className={btnIcon} aria-label={`Copiar código ${code}`} title="Copiar código">
      <i className="fas fa-copy text-xs"></i>
    </button>
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Convites ativos"
        description="QR Codes ainda válidos no condomínio, ordenados pelo vencimento mais próximo."
        action={
          <button type="button" onClick={() => setCreating(true)} className={btnPrimary}>
            <i className="fas fa-plus text-xs"></i>
            Novo convite
          </button>
        }
      />

      <section className="overflow-hidden rounded-xl border border-white/[0.08] bg-brand-800 shadow-card">
        <div className="flex flex-col gap-3 border-b border-white/[0.08] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Buscar por convidado, CPF, unidade ou código"
            label="Buscar convites"
            className="w-full sm:w-96"
          />
          <p className="text-xs text-slate-500">
            {invites.refreshError
              ? 'Falha ao atualizar. Exibindo os últimos dados carregados.'
              : `${filtered.length} convite${filtered.length === 1 ? '' : 's'} válido${filtered.length === 1 ? '' : 's'}`}
          </p>
        </div>

        {invites.loading ? (
          <TableSkeleton rows={6} />
        ) : invites.error ? (
          <ErrorState error={invites.error} onRetry={invites.reload} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="fa-ticket"
            title="Nenhum convite ativo"
            text={query.trim() ? 'Nenhum convite corresponde à busca.' : 'Não há convites válidos no momento.'}
          />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[900px] text-left" data-testid="invites-table">
                <thead className="border-b border-white/[0.08] bg-brand-900/40">
                  <tr className="text-xs uppercase tracking-wider text-slate-500">
                    <th scope="col" className="px-6 py-3 font-medium">Convidado</th>
                    <th scope="col" className="px-6 py-3 font-medium">CPF</th>
                    <th scope="col" className="px-6 py-3 font-medium">Unidade</th>
                    <th scope="col" className="px-6 py-3 font-medium">Morador responsável</th>
                    <th scope="col" className="px-6 py-3 font-medium">Validade</th>
                    <th scope="col" className="px-6 py-3 font-medium">Código</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {filtered.length > 0 &&
                    rows.map((i) => (
                      <tr key={i.id} className="transition-colors duration-150 hover:bg-slate-800/40">
                        <td className="px-6 py-4 text-sm font-medium text-slate-100">{i.guestName}</td>
                        <td className="whitespace-nowrap px-6 py-4 font-mono text-sm text-slate-300">{maskCpf(i.guestCpf)}</td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-300">{i.unit}</td>
                        <td className="px-6 py-4 text-sm text-slate-300">{i.host}</td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm">
                          <p className="text-slate-100">até {fmtDateTime(i.validUntil)}</p>
                          <p className="mt-0.5 text-xs text-slate-500">{fmtRemaining(i.validUntil - now)}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1">
                            <span className="font-mono text-sm text-slate-300">{i.code}</span>
                            <CopyButton code={i.code} />
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-white/[0.06] md:hidden">
              {rows.map((i) => (
                <li key={i.id} className="space-y-3 px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-100">{i.guestName}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{i.unit}</p>
                    </div>
                    <span className="shrink-0 text-xs text-slate-400">{fmtRemaining(i.validUntil - now)}</span>
                  </div>
                  <dl className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <dt className="text-slate-500">CPF</dt>
                      <dd className="mt-0.5 font-mono text-slate-300">{maskCpf(i.guestCpf)}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Válido até</dt>
                      <dd className="mt-0.5 text-slate-300">{fmtDateTime(i.validUntil)}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-slate-500">Morador responsável</dt>
                      <dd className="mt-0.5 text-slate-300">{i.host}</dd>
                    </div>
                  </dl>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm text-slate-300">{i.code}</span>
                    <CopyButton code={i.code} />
                  </div>
                </li>
              ))}
            </ul>

            <Pagination page={currentPage} pageSize={PAGE_SIZE} total={filtered.length} onChange={setPage} noun="convites" />
          </>
        )}
      </section>

      {creating && (
        <InviteFormModal
          onClose={() => setCreating(false)}
          onCreated={() => invites.refresh()}
          onToast={onToast}
        />
      )}
    </div>
  );
}
