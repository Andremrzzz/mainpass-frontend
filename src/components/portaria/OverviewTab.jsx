import React, { useEffect, useMemo, useState } from 'react';
import PageHeader from '../ui/PageHeader';
import Badge from '../ui/Badge';
import Select from '../ui/Select';
import SearchInput from '../ui/SearchInput';
import Pagination, { paginate } from '../ui/Pagination';
import { EmptyState, ErrorState, TableSkeleton } from '../ui/States';
import StatCard from './StatCard';
import useNow from '../../hooks/useNow';
import useResource from '../../hooks/useResource';
import { getResumo, listAcessos } from '../../services/portariaService';
import { FOCUS_RING } from '../../constants/dashboard';
import { ACCESS_STATUS, ACCESS_STATUS_TABS, DIRECTION, PAGE_SIZE, PERIOD_OPTIONS } from '../../constants/portaria';
import { DAY_MS, fmtClock, fmtDateTime, startOfToday } from '../../utils/dates';
import { maskCpf } from '../../utils/format';
import { normalizeText, onlyDigits } from '../../utils/masks';

const REFRESH_MS = 15000;

const matchStatus = (log, key) => {
  if (key === 'permitidos') return log.status === 'permitido';
  if (key === 'negados') return log.status !== 'permitido';
  return true;
};

function Direction({ direction }) {
  const d = DIRECTION[direction];
  return (
    <span className="mt-1 inline-flex items-center gap-1.5 text-xs text-slate-500">
      <i className={`fas ${d.icon} text-[10px]`}></i>
      {d.label}
    </span>
  );
}

function PersonType({ type }) {
  return <span className="text-xs text-slate-500">{type === 'morador' ? 'Morador' : 'Visitante'}</span>;
}

/** Aba 1: indicadores e histórico global de acessos (atualiza sozinho a cada 15 s). */
export default function OverviewTab() {
  const now = useNow(60000);
  const summary = useResource(getResumo, 'summary', { refreshMs: REFRESH_MS });
  const logs = useResource(listAcessos, 'logs', { refreshMs: REFRESH_MS });

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [period, setPeriod] = useState('hoje');
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [query, statusFilter, period]);

  // Período + busca (base para os contadores das abas)
  const scoped = useMemo(() => {
    const since = period === 'hoje' ? startOfToday() : now - Number(period) * DAY_MS;
    const q = normalizeText(query.trim());
    const qDigits = onlyDigits(query);

    return (logs.data ?? []).filter((l) => {
      if (l.timestamp < since) return false;
      if (!q) return true;
      const haystack = normalizeText(
        [l.personName, l.unit, l.host, ACCESS_STATUS[l.status]?.label, l.reason, DIRECTION[l.direction]?.label].join(' ')
      );
      return haystack.includes(q) || (qDigits.length >= 3 && onlyDigits(l.document).includes(qDigits));
    });
  }, [logs.data, period, query, now]);

  const counts = useMemo(
    () => ({
      todos: scoped.length,
      permitidos: scoped.filter((l) => matchStatus(l, 'permitidos')).length,
      negados: scoped.filter((l) => matchStatus(l, 'negados')).length,
    }),
    [scoped]
  );

  const filtered = useMemo(
    () => scoped.filter((l) => matchStatus(l, statusFilter)).sort((a, b) => b.timestamp - a.timestamp),
    [scoped, statusFilter]
  );

  const { rows, page: currentPage } = paginate(filtered, page, PAGE_SIZE);
  const hasFilters = query.trim() !== '' || statusFilter !== 'todos';

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([summary.refresh(), logs.refresh()]);
    setRefreshing(false);
  };

  const clearFilters = () => {
    setQuery('');
    setStatusFilter('todos');
  };

  const stats = summary.data;
  const refreshError = logs.refreshError || summary.refreshError;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Visão geral"
        description="Indicadores do condomínio e registro de entradas e saídas em tempo real."
      />

      {/* Indicadores */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon="fa-door-open" label="Acessos hoje" value={stats?.acessosHoje} hint="Entradas permitidas desde 00:00" />
        <StatCard icon="fa-person-walking-arrow-right" label="Visitantes agora" value={stats?.visitantesAgora} hint="Dentro do condomínio" />
        <StatCard icon="fa-users" label="Moradores cadastrados" value={stats?.moradores} />
        <StatCard icon="fa-headset" label="Chamados abertos" value={stats?.chamadosAbertos} hint="Aguardando a portaria" />
      </div>

      {/* Histórico global */}
      <section className="overflow-hidden rounded-xl border border-white/[0.08] bg-brand-800 shadow-card">
        <div className="flex flex-col gap-4 border-b border-white/[0.08] px-5 py-5 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-100">Registro de acessos</h2>
              <p className={`mt-1 text-xs ${refreshError ? 'text-rose-400' : 'text-slate-500'}`}>
                {refreshError
                  ? 'Falha ao atualizar. Exibindo os últimos dados carregados.'
                  : logs.updatedAt
                    ? `Atualizado às ${fmtClock(logs.updatedAt)}`
                    : 'Carregando...'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing || logs.loading}
              className={`inline-flex h-9 items-center gap-2 rounded-lg border border-white/15 px-3 text-sm text-slate-300 transition-colors duration-200 hover:border-white/25 hover:bg-white/[0.04] disabled:opacity-50 ${FOCUS_RING}`}
            >
              <i className={`fas fa-rotate-right text-xs ${refreshing ? 'animate-spin' : ''}`}></i>
              Atualizar
            </button>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <SearchInput
                value={query}
                onChange={setQuery}
                placeholder="Buscar por nome, CPF, unidade ou morador"
                label="Buscar no registro de acessos"
                className="w-full sm:w-80"
              />
              <Select
                value={period}
                onChange={setPeriod}
                options={PERIOD_OPTIONS}
                label="Período"
                className="w-full sm:w-48"
              />
            </div>

            <div
              className="inline-flex w-full rounded-lg border border-white/[0.08] bg-brand-900 p-1 sm:w-auto"
              role="tablist"
              aria-label="Filtrar por status"
            >
              {ACCESS_STATUS_TABS.map((t) => {
                const active = statusFilter === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setStatusFilter(t.key)}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-200 sm:flex-none ${FOCUS_RING} ${
                      active ? 'bg-white/[0.08] text-slate-100' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {t.label}
                    <span className={`rounded px-1.5 py-0.5 text-xs ${active ? 'bg-white/[0.08] text-slate-200' : 'text-slate-500'}`}>
                      {counts[t.key]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {logs.loading ? (
          <TableSkeleton rows={8} />
        ) : logs.error ? (
          <ErrorState error={logs.error} onRetry={logs.reload} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="fa-clock-rotate-left"
            title="Nenhum registro encontrado"
            text={hasFilters ? 'Ajuste a busca ou o filtro de status.' : 'Não há acessos registrados neste período.'}
            action={
              hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className={`mt-5 rounded text-sm font-medium text-accent-muted transition-colors duration-200 hover:text-indigo-300 ${FOCUS_RING}`}
                >
                  Limpar filtros
                </button>
              )
            }
          />
        ) : (
          <>
            {/* Desktop: tabela */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[900px] text-left" data-testid="access-table">
                <thead className="border-b border-white/[0.08] bg-brand-900/40">
                  <tr className="text-xs uppercase tracking-wider text-slate-500">
                    <th scope="col" className="px-6 py-3 font-medium">Horário</th>
                    <th scope="col" className="px-6 py-3 font-medium">Visitante / Morador</th>
                    <th scope="col" className="px-6 py-3 font-medium">CPF / Documento</th>
                    <th scope="col" className="px-6 py-3 font-medium">Unidade / Bloco</th>
                    <th scope="col" className="px-6 py-3 font-medium">Morador responsável</th>
                    <th scope="col" className="px-6 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {rows.map((l) => (
                    <tr key={l.id} className="transition-colors duration-150 hover:bg-slate-800/40">
                      <td className="whitespace-nowrap px-6 py-4 align-top text-sm tabular-nums text-slate-100">
                        {fmtDateTime(l.timestamp)}
                        <div><Direction direction={l.direction} /></div>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <p className="text-sm text-slate-100">{l.personName}</p>
                        <PersonType type={l.personType} />
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 align-top font-mono text-sm text-slate-300">{maskCpf(l.document)}</td>
                      <td className="whitespace-nowrap px-6 py-4 align-top text-sm text-slate-300">{l.unit}</td>
                      <td className="px-6 py-4 align-top text-sm text-slate-300">{l.host}</td>
                      <td className="px-6 py-4 align-top">
                        <Badge tone={ACCESS_STATUS[l.status].tone}>{ACCESS_STATUS[l.status].label}</Badge>
                        {l.reason && <p className="mt-1.5 text-xs text-slate-500">{l.reason}</p>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile: lista */}
            <ul className="divide-y divide-white/[0.06] md:hidden">
              {rows.map((l) => (
                <li key={l.id} className="space-y-3 px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-sm tabular-nums text-slate-100">{fmtDateTime(l.timestamp)}</span>
                    <Badge tone={ACCESS_STATUS[l.status].tone}>{ACCESS_STATUS[l.status].label}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-slate-100">{l.personName}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {l.personType === 'morador' ? 'Morador' : 'Visitante'} · {DIRECTION[l.direction].label}
                    </p>
                  </div>
                  <dl className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <dt className="text-slate-500">CPF / Documento</dt>
                      <dd className="mt-0.5 font-mono text-slate-300">{maskCpf(l.document)}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Destino</dt>
                      <dd className="mt-0.5 text-slate-300">{l.unit}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-slate-500">Morador responsável</dt>
                      <dd className="mt-0.5 text-slate-300">{l.host}</dd>
                    </div>
                  </dl>
                  {l.reason && <p className="text-xs text-slate-500">Motivo: {l.reason}</p>}
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
