import React, { useMemo, useState } from 'react';
import PageHeader from '../ui/PageHeader';
import Badge from '../ui/Badge';
import SearchInput from '../ui/SearchInput';
import Pagination, { paginate } from '../ui/Pagination';
import { EmptyState, ErrorState, TableSkeleton } from '../ui/States';
import useResource from '../../hooks/useResource';
import { listAcessos } from '../../services/portariaService';
import { ACCESS_STATUS, PAGE_SIZE } from '../../constants/portaria';
import { fmtDateTime } from '../../utils/dates';
import { maskCpf } from '../../utils/format';
import { normalizeText } from '../../utils/masks';

/**
 * "Histórico de Entradas" (porteiro).
 * Consulta somente o registro de acessos da portaria (GET /api/acessos, via portariaService)
 * e mostra apenas as ENTRADAS. Não usa nenhum dado/endpoint de passes pessoais do morador.
 */
export default function EntryHistory() {
  const logs = useResource(listAcessos, 'entry-history', { refreshMs: 15000 });
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = normalizeText(query.trim());
    return (logs.data ?? [])
      .filter((l) => l.direction === 'entrada')
      .filter((l) => !q || normalizeText([l.personName, l.unit, l.host, l.reason].join(' ')).includes(q))
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [logs.data, query]);

  const { rows, page: currentPage } = paginate(filtered, page, PAGE_SIZE);

  return (
    <div className="space-y-6">
      <PageHeader title="Histórico de Entradas" description="Entradas registradas pela portaria, da mais recente para a mais antiga." />

      <section className="overflow-hidden rounded-xl border border-white/[0.08] bg-brand-800 shadow-card">
        <div className="border-b border-white/[0.08] px-5 py-4 sm:px-6">
          <SearchInput
            value={query}
            onChange={(v) => { setQuery(v); setPage(1); }}
            placeholder="Buscar por nome, unidade ou morador"
            label="Buscar no histórico de entradas"
            className="w-full sm:w-80"
          />
        </div>

        {logs.loading ? (
          <TableSkeleton rows={8} />
        ) : logs.error ? (
          <ErrorState error={logs.error} onRetry={logs.reload} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="fa-clock-rotate-left"
            title="Nenhuma entrada encontrada"
            text={query ? 'Ajuste a busca.' : 'Ainda não há entradas registradas.'}
          />
        ) : (
          <>
            <ul className="divide-y divide-white/[0.06]" data-testid="entry-list">
              {rows.map((l) => (
                <li key={l.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <div>
                    <p className="text-sm text-slate-100">{l.personName}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {l.personType === 'morador' ? 'Morador' : 'Visitante'} · {maskCpf(l.document)} · {l.unit}
                      {l.host ? ` · ${l.host}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm tabular-nums text-slate-300">{fmtDateTime(l.timestamp)}</span>
                    <Badge tone={ACCESS_STATUS[l.status]?.tone}>{ACCESS_STATUS[l.status]?.label ?? l.status}</Badge>
                  </div>
                </li>
              ))}
            </ul>
            <Pagination page={currentPage} pageSize={PAGE_SIZE} total={filtered.length} onChange={setPage} />
          </>
        )}
      </section>
    </div>
  );
}
