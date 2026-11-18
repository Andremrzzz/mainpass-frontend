import React, { useEffect, useMemo, useState } from 'react';
import PageHeader from '../ui/PageHeader';
import Badge from '../ui/Badge';
import SearchInput from '../ui/SearchInput';
import Pagination, { paginate } from '../ui/Pagination';
import { EmptyState, ErrorState, TableSkeleton } from '../ui/States';
import ResidentFormModal from './ResidentFormModal';
import ResidentDetailsModal from './ResidentDetailsModal';
import useResource from '../../hooks/useResource';
import { listMoradores } from '../../services/portariaService';
import { FOCUS_RING } from '../../constants/dashboard';
import { PAGE_SIZE, RESIDENT_STATUS, RESIDENT_TABS } from '../../constants/portaria';
import { btnIcon, btnPrimary } from '../../constants/ui';
import { maskCpf } from '../../utils/format';
import { formatPhone, normalizeText, onlyDigits } from '../../utils/masks';
import { formatUnit } from '../../utils/residents';

/**
 * Aba 2: gestão de moradores (listar, buscar, cadastrar, editar e ver detalhes).
 * `onToast` exibe o feedback das operações.
 */
export default function ResidentsTab({ onToast }) {
  const residents = useResource(listMoradores);

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [page, setPage] = useState(1);
  // { mode: 'details' | 'form', resident: morador | null }
  const [modal, setModal] = useState(null);

  useEffect(() => {
    setPage(1);
  }, [query, statusFilter]);

  const searched = useMemo(() => {
    const q = normalizeText(query.trim());
    const qDigits = onlyDigits(query);
    return (residents.data ?? []).filter((r) => {
      if (!q) return true;
      return (
        normalizeText([r.nome, r.email, r.unidade, r.bloco, formatUnit(r), `apto ${r.unidade}`].join(' ')).includes(q) ||
        (qDigits.length >= 3 && onlyDigits(r.cpf).includes(qDigits))
      );
    });
  }, [residents.data, query]);

  const counts = useMemo(
    () => ({
      todos: searched.length,
      ativo: searched.filter((r) => r.status === 'ativo').length,
      bloqueado: searched.filter((r) => r.status === 'bloqueado').length,
    }),
    [searched]
  );

  const filtered = useMemo(
    () => searched.filter((r) => statusFilter === 'todos' || r.status === statusFilter),
    [searched, statusFilter]
  );

  const { rows, page: currentPage } = paginate(filtered, page, PAGE_SIZE);
  const hasFilters = query.trim() !== '' || statusFilter !== 'todos';

  const closeModal = () => setModal(null);

  // Após criar/editar: fecha o formulário, atualiza a lista em segundo plano e avisa
  const handleSaved = (saved, message) => {
    setModal(null);
    residents.refresh();
    onToast(message);
  };

  // Após bloquear/desbloquear no modal de detalhes (que continua aberto)
  const handleUpdated = (updated, message) => {
    residents.refresh();
    onToast(message);
  };

  const openDetails = (resident) => setModal({ mode: 'details', resident });
  const openForm = (resident = null) => setModal({ mode: 'form', resident });

  const RowActions = ({ r }) => (
    <div className="flex items-center justify-end gap-1">
      <button type="button" onClick={() => openDetails(r)} className={btnIcon} aria-label={`Ver detalhes de ${r.nome}`} title="Ver detalhes">
        <i className="fas fa-eye text-xs"></i>
      </button>
      <button type="button" onClick={() => openForm(r)} className={btnIcon} aria-label={`Editar ${r.nome}`} title="Editar">
        <i className="fas fa-pen text-xs"></i>
      </button>
    </div>
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Gestão de moradores"
        description="Cadastre, consulte e atualize os moradores do condomínio."
        action={
          <button type="button" onClick={() => openForm(null)} className={btnPrimary}>
            <i className="fas fa-plus text-xs"></i>
            Novo morador
          </button>
        }
      />

      <section className="overflow-hidden rounded-xl border border-white/[0.08] bg-brand-800 shadow-card">
        <div className="flex flex-col gap-3 border-b border-white/[0.08] px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Buscar por nome, CPF ou unidade"
            label="Buscar moradores"
            className="w-full lg:w-96"
          />

          <div
            className="inline-flex w-full rounded-lg border border-white/[0.08] bg-brand-900 p-1 sm:w-auto"
            role="tablist"
            aria-label="Filtrar por status da conta"
          >
            {RESIDENT_TABS.map((t) => {
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

        {residents.loading ? (
          <TableSkeleton rows={8} />
        ) : residents.error ? (
          <ErrorState error={residents.error} onRetry={residents.reload} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="fa-users"
            title="Nenhum morador encontrado"
            text={hasFilters ? 'Ajuste a busca ou o filtro de status.' : 'Cadastre o primeiro morador para começar.'}
            action={
              hasFilters ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setStatusFilter('todos');
                  }}
                  className={`mt-5 rounded text-sm font-medium text-accent-muted transition-colors duration-200 hover:text-indigo-300 ${FOCUS_RING}`}
                >
                  Limpar filtros
                </button>
              ) : null
            }
          />
        ) : (
          <>
            {/* Desktop: tabela */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[960px] text-left" data-testid="residents-table">
                <thead className="border-b border-white/[0.08] bg-brand-900/40">
                  <tr className="text-xs uppercase tracking-wider text-slate-500">
                    <th scope="col" className="px-6 py-3 font-medium">Nome completo</th>
                    <th scope="col" className="px-6 py-3 font-medium">CPF</th>
                    <th scope="col" className="px-6 py-3 font-medium">E-mail</th>
                    <th scope="col" className="px-6 py-3 font-medium">Telefone</th>
                    <th scope="col" className="px-6 py-3 font-medium">Unidade / Bloco</th>
                    <th scope="col" className="px-6 py-3 font-medium">Status</th>
                    <th scope="col" className="px-6 py-3 text-right font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {rows.map((r) => (
                    <tr key={r.id} className="transition-colors duration-150 hover:bg-slate-800/40">
                      <td className="px-6 py-4 text-sm font-medium text-slate-100">{r.nome}</td>
                      <td className="whitespace-nowrap px-6 py-4 font-mono text-sm text-slate-300">{maskCpf(r.cpf)}</td>
                      <td className="px-6 py-4 text-sm text-slate-300">{r.email}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm tabular-nums text-slate-300">{formatPhone(r.telefone)}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-300">{formatUnit(r)}</td>
                      <td className="px-6 py-4">
                        <Badge tone={RESIDENT_STATUS[r.status].tone}>{RESIDENT_STATUS[r.status].label}</Badge>
                      </td>
                      <td className="px-4 py-4">
                        <RowActions r={r} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile: lista */}
            <ul className="divide-y divide-white/[0.06] md:hidden">
              {rows.map((r) => (
                <li key={r.id} className="space-y-3 px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-100">{r.nome}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{formatUnit(r)}</p>
                    </div>
                    <Badge tone={RESIDENT_STATUS[r.status].tone}>{RESIDENT_STATUS[r.status].label}</Badge>
                  </div>
                  <dl className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <dt className="text-slate-500">CPF</dt>
                      <dd className="mt-0.5 font-mono text-slate-300">{maskCpf(r.cpf)}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Telefone</dt>
                      <dd className="mt-0.5 text-slate-300">{formatPhone(r.telefone)}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-slate-500">E-mail</dt>
                      <dd className="mt-0.5 break-all text-slate-300">{r.email}</dd>
                    </div>
                  </dl>
                  <RowActions r={r} />
                </li>
              ))}
            </ul>

            <Pagination page={currentPage} pageSize={PAGE_SIZE} total={filtered.length} onChange={setPage} noun="moradores" />
          </>
        )}
      </section>

      {modal?.mode === 'details' && (
        <ResidentDetailsModal
          resident={modal.resident}
          onClose={closeModal}
          onEdit={openForm}
          onUpdated={handleUpdated}
        />
      )}
      {modal?.mode === 'form' && (
        <ResidentFormModal resident={modal.resident} onClose={closeModal} onSaved={handleSaved} />
      )}
    </div>
  );
}
