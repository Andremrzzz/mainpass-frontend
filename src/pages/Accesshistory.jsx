import React, { useEffect, useMemo, useState } from 'react';

/* -------------------------------------------------------------------------- */
/*  Dados de exemplo (substituir pela resposta da API: GET /acessos/historico) */
/*  Gerados de forma determinística, relativos à data atual.                  */
/* -------------------------------------------------------------------------- */
const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

const mulberry32 = (seed) => {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const ACCESS_POINTS = [
  { location: 'Portaria Principal - Guichê 01', device: 'Leitor ESP32 - Entrada 01', direction: 'entrada' },
  { location: 'Portaria Principal - Guichê 01', device: 'Leitor ESP32 - Saída 01', direction: 'saida' },
  { location: 'Portaria Principal - Guichê 02', device: 'Leitor ESP32 - Entrada 02', direction: 'entrada' },
  { location: 'Catraca Bloco A', device: 'Leitor ESP32 - Bloco A', direction: 'entrada' },
  { location: 'Catraca Bloco B', device: 'Leitor ESP32 - Bloco B', direction: 'entrada' },
  { location: 'Catraca Bloco B', device: 'Leitor ESP32 - Bloco B (Saída)', direction: 'saida' },
  { location: 'Portão da Garagem', device: 'Leitor ESP32 - Garagem', direction: 'entrada' },
  { location: 'Entrada de Serviço', device: 'Leitor ESP32 - Serviço', direction: 'entrada' },
];

const PASS_TYPES = ['QR Code Convidado', 'Passe Individual', 'Acesso Permanente'];

const DENIALS = [
  { status: 'expirado', reason: 'Passe expirado' },
  { status: 'negado', reason: 'Fora do horário permitido' },
  { status: 'negado', reason: 'QR Code inválido' },
  { status: 'negado', reason: 'Aprovação pendente' },
  { status: 'expirado', reason: 'Validade encerrada' },
];

const buildMockRecords = () => {
  const rand = mulberry32(20261108);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const now = Date.now();
  const records = [];

  for (let day = 0; day < 60; day += 1) {
    const dayStart = new Date(now - day * DAY);
    dayStart.setHours(0, 0, 0, 0);
    const count = Math.floor(rand() * 3) + (day < 10 ? 1 : 0);

    for (let i = 0; i < count; i += 1) {
      const hour = 6 + Math.floor(rand() * 17);
      const minute = Math.floor(rand() * 60);
      let timestamp = dayStart.getTime() + hour * HOUR + minute * MIN;
      if (timestamp > now) timestamp = now - Math.floor(rand() * 3 * HOUR) - MIN;

      const point = pick(ACCESS_POINTS);
      const denied = rand() < 0.16;
      const outcome = denied ? pick(DENIALS) : { status: 'permitido', reason: '' };

      records.push({
        id: `AC-${String(records.length + 1).padStart(4, '0')}`,
        timestamp,
        location: point.location,
        direction: point.direction,
        device: point.device,
        passType: pick(PASS_TYPES),
        status: outcome.status,
        reason: outcome.reason,
      });
    }
  }
  return records;
};

const MOCK_RECORDS = buildMockRecords();

/* -------------------------------------------------------------------------- */
/*  Configurações de exibição                                                 */
/* -------------------------------------------------------------------------- */
const STATUS = {
  permitido: {
    label: 'Permitido',
    badge: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20',
    dot: 'bg-emerald-400',
  },
  negado: {
    label: 'Negado',
    badge: 'bg-rose-500/10 text-rose-400 ring-rose-500/20',
    dot: 'bg-rose-400',
  },
  expirado: {
    label: 'Expirado',
    badge: 'bg-amber-500/10 text-amber-400 ring-amber-500/20',
    dot: 'bg-amber-400',
  },
};

const DIRECTION = {
  entrada: { label: 'Entrada', icon: 'fa-arrow-right-to-bracket' },
  saida: { label: 'Saída', icon: 'fa-arrow-right-from-bracket' },
};

const STATUS_TABS = [
  { key: 'todos', label: 'Todos' },
  { key: 'permitidos', label: 'Permitidos' },
  { key: 'negados', label: 'Negados' },
];

const PERIODS = [
  { value: 7, label: 'Últimos 7 dias' },
  { value: 30, label: 'Últimos 30 dias' },
  { value: 90, label: 'Últimos 90 dias' },
];

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-900';

const btnSecondary = `inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-white/15 px-4 text-sm font-medium text-slate-200 transition-colors duration-200 hover:border-white/25 hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`;

const btnPager = `inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-white/15 px-3 text-sm font-medium text-slate-300 transition-colors duration-200 hover:border-white/25 hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-white/15 disabled:hover:bg-transparent ${focusRing}`;

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */
const pad = (n) => String(n).padStart(2, '0');

// 08/11/2026 - 14:32
const fmtDateTime = (ts) => {
  const d = new Date(ts);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} - ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const normalize = (s) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const matchStatus = (record, key) => {
  if (key === 'permitidos') return record.status === 'permitido';
  if (key === 'negados') return record.status !== 'permitido';
  return true;
};

/* -------------------------------------------------------------------------- */
/*  Componentes de apoio                                                      */
/* -------------------------------------------------------------------------- */
function StatusBadge({ status }) {
  const st = STATUS[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${st.badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`}></span>
      {st.label}
    </span>
  );
}

function Direction({ direction }) {
  const d = DIRECTION[direction];
  return (
    <span className="mt-1 inline-flex items-center gap-1.5 text-xs text-slate-500">
      <i className={`fas ${d.icon} text-[10px]`}></i>
      {d.label}
    </span>
  );
}

function PassTypePill({ children }) {
  return (
    <span className="inline-flex items-center rounded-md bg-white/[0.04] px-2 py-1 text-xs text-slate-300 ring-1 ring-inset ring-white/[0.08]">
      {children}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  Página de Histórico de Acessos                                            */
/*                                                                            */
/*  Props:                                                                    */
/*   - records:  lista de registros { id, timestamp, location, direction,     */
/*               device, passType, status, reason }                           */
/*   - pageSize: itens por página (padrão 10)                                 */
/* -------------------------------------------------------------------------- */
export default function AccessHistory({ records = MOCK_RECORDS, pageSize = 10 }) {
  const [now] = useState(() => Date.now());
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [period, setPeriod] = useState(30);
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const [exportOpen, setExportOpen] = useState(false);
  const [notice, setNotice] = useState(null); // { type, text }

  // Fecha o menu de exportação com ESC
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') setExportOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Aviso temporário
  useEffect(() => {
    if (!notice) return undefined;
    const id = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(id);
  }, [notice]);

  // Volta para a primeira página ao mudar filtros ou ordenação
  useEffect(() => {
    setPage(1);
  }, [query, statusFilter, period, sortDir]);

  // Registros do período + busca (base para os contadores das abas)
  const scoped = useMemo(() => {
    const since = now - period * DAY;
    const q = normalize(query.trim());
    return records.filter((r) => {
      if (r.timestamp < since) return false;
      if (!q) return true;
      const haystack = normalize(
        [
          r.location,
          r.passType,
          r.device,
          STATUS[r.status].label,
          r.reason,
          DIRECTION[r.direction].label,
        ].join(' ')
      );
      return haystack.includes(q);
    });
  }, [records, now, period, query]);

  const counts = useMemo(
    () => ({
      todos: scoped.length,
      permitidos: scoped.filter((r) => matchStatus(r, 'permitidos')).length,
      negados: scoped.filter((r) => matchStatus(r, 'negados')).length,
    }),
    [scoped]
  );

  const sorted = useMemo(
    () =>
      scoped
        .filter((r) => matchStatus(r, statusFilter))
        .sort((a, b) => (sortDir === 'desc' ? b.timestamp - a.timestamp : a.timestamp - b.timestamp)),
    [scoped, statusFilter, sortDir]
  );

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const rangeStart = sorted.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, sorted.length);

  const hasActiveFilters = query.trim() !== '' || statusFilter !== 'todos';

  const clearFilters = () => {
    setQuery('');
    setStatusFilter('todos');
  };

  /* ------------------------------ Exportação ------------------------------ */
  const exportCsv = () => {
    setExportOpen(false);
    if (sorted.length === 0) {
      setNotice({ type: 'error', text: 'Não há registros para exportar com os filtros atuais.' });
      return;
    }

    const header = [
      'Data e horário',
      'Local de acesso',
      'Sentido',
      'Tipo de passe',
      'Status',
      'Motivo',
      'Dispositivo / leitor',
    ];
    const rows = sorted.map((r) => [
      fmtDateTime(r.timestamp),
      r.location,
      DIRECTION[r.direction].label,
      r.passType,
      STATUS[r.status].label,
      r.reason || '',
      r.device,
    ]);

    const escape = (v) => `"${String(v).replace(/"/g, '""')}"`;
    // BOM + separador ";" para abrir corretamente no Excel em português
    const csv =
      '\uFEFF' + [header, ...rows].map((row) => row.map(escape).join(';')).join('\r\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const today = new Date();
    const link = document.createElement('a');
    link.href = url;
    link.download = `historico-acessos-${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setNotice({
      type: 'success',
      text: `Relatório exportado com ${sorted.length} ${sorted.length === 1 ? 'registro' : 'registros'}.`,
    });
  };

  const exportPdf = () => {
    setExportOpen(false);
    // TODO: gerar o PDF no back-end (ou com jsPDF/pdfmake) a partir de `sorted`
    setNotice({
      type: 'error',
      text: 'A exportação em PDF ainda não está disponível. Use o formato CSV por enquanto.',
    });
  };

  const toggleSort = () => setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));

  /* --------------------------------- Render -------------------------------- */
  return (
    <div className="w-full space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
            Histórico de acessos
          </h1>
          <p className="mt-1.5 text-sm text-slate-400">
            Registro de entradas e saídas realizadas com os seus passes.
          </p>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setExportOpen((v) => !v)}
            className={btnSecondary}
            aria-haspopup="menu"
            aria-expanded={exportOpen}
          >
            <i className="fas fa-file-export text-xs"></i>
            Exportar relatório
            <i className="fas fa-chevron-down text-[10px] text-slate-500"></i>
          </button>

          {exportOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setExportOpen(false)}></div>
              <div
                role="menu"
                className="absolute right-0 z-40 mt-2 w-52 overflow-hidden rounded-xl border border-white/[0.08] bg-brand-800 py-1 shadow-overlay"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={exportCsv}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-200 transition-colors duration-150 hover:bg-white/[0.05]"
                >
                  <i className="fas fa-file-csv w-4 text-center text-slate-500"></i>
                  Exportar CSV
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={exportPdf}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-200 transition-colors duration-150 hover:bg-white/[0.05]"
                >
                  <i className="fas fa-file-pdf w-4 text-center text-slate-500"></i>
                  Exportar PDF
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Aviso */}
      {notice && (
        <div
          role={notice.type === 'success' ? 'status' : 'alert'}
          className={`flex items-start justify-between gap-3 rounded-lg border px-3.5 py-3 text-sm ${
            notice.type === 'success'
              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
              : 'border-amber-500/20 bg-amber-500/10 text-amber-300'
          }`}
        >
          <div className="flex items-start gap-2.5">
            <i
              className={`fas ${
                notice.type === 'success' ? 'fa-circle-check' : 'fa-circle-info'
              } mt-0.5 text-xs`}
            ></i>
            <span>{notice.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className={`-mr-1 flex h-5 w-5 shrink-0 items-center justify-center rounded opacity-70 transition-opacity hover:opacity-100 ${focusRing}`}
            aria-label="Dispensar aviso"
          >
            <i className="fas fa-xmark text-xs"></i>
          </button>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-72">
            <i className="fas fa-magnifying-glass pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500"></i>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por local, tipo ou leitor"
              aria-label="Buscar no histórico"
              className="h-10 w-full rounded-lg border border-white/15 bg-brand-800 pl-9 pr-3 text-sm text-slate-100 placeholder-slate-500 transition-colors duration-200 hover:border-white/25 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          <div className="relative w-full sm:w-48">
            <select
              value={period}
              onChange={(e) => setPeriod(Number(e.target.value))}
              aria-label="Período"
              className="h-10 w-full appearance-none rounded-lg border border-white/15 bg-brand-800 pl-3 pr-9 text-sm text-slate-100 transition-colors duration-200 hover:border-white/25 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            >
              {PERIODS.map((p) => (
                <option key={p.value} value={p.value} className="bg-brand-800">
                  {p.label}
                </option>
              ))}
            </select>
            <i className="fas fa-chevron-down pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500"></i>
          </div>
        </div>

        <div
          className="inline-flex w-full rounded-lg border border-white/[0.08] bg-brand-800 p-1 sm:w-auto"
          role="tablist"
          aria-label="Filtrar por status"
        >
          {STATUS_TABS.map((t) => {
            const active = statusFilter === t.key;
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setStatusFilter(t.key)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-200 sm:flex-none ${focusRing} ${
                  active
                    ? 'bg-white/[0.08] text-slate-100'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {t.label}
                <span
                  className={`rounded px-1.5 py-0.5 text-xs ${
                    active ? 'bg-white/[0.08] text-slate-200' : 'text-slate-500'
                  }`}
                >
                  {counts[t.key]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tabela / lista */}
      <section className="overflow-hidden rounded-xl border border-white/[0.08] bg-brand-800 shadow-card">
        {sorted.length > 0 ? (
          <>
            {/* Desktop: tabela */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[760px] text-left">
                <thead className="border-b border-white/[0.08] bg-brand-900/40">
                  <tr className="text-xs uppercase tracking-wider text-slate-500">
                    <th
                      scope="col"
                      className="px-6 py-3 font-medium"
                      aria-sort={sortDir === 'desc' ? 'descending' : 'ascending'}
                    >
                      <button
                        type="button"
                        onClick={toggleSort}
                        className={`-ml-1 inline-flex items-center gap-1.5 rounded px-1 uppercase tracking-wider transition-colors duration-200 hover:text-slate-300 ${focusRing}`}
                      >
                        Data e horário
                        <i className={`fas ${sortDir === 'desc' ? 'fa-arrow-down' : 'fa-arrow-up'} text-[10px]`}></i>
                      </button>
                    </th>
                    <th scope="col" className="px-6 py-3 font-medium">Local de acesso</th>
                    <th scope="col" className="px-6 py-3 font-medium">Tipo de passe</th>
                    <th scope="col" className="px-6 py-3 font-medium">Status</th>
                    <th scope="col" className="px-6 py-3 font-medium">Dispositivo / leitor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {pageRows.map((r) => (
                    <tr key={r.id} className="transition-colors duration-150 hover:bg-slate-800/40">
                      <td className="whitespace-nowrap px-6 py-4 align-top text-sm tabular-nums text-slate-100">
                        {fmtDateTime(r.timestamp)}
                      </td>
                      <td className="px-6 py-4 align-top">
                        <p className="text-sm text-slate-100">{r.location}</p>
                        <Direction direction={r.direction} />
                      </td>
                      <td className="px-6 py-4 align-top">
                        <PassTypePill>{r.passType}</PassTypePill>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <StatusBadge status={r.status} />
                        {r.reason && <p className="mt-1.5 text-xs text-slate-500">{r.reason}</p>}
                      </td>
                      <td className="px-6 py-4 align-top text-sm text-slate-400">{r.device}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile: lista */}
            <ul className="divide-y divide-white/[0.06] md:hidden">
              {pageRows.map((r) => (
                <li key={r.id} className="space-y-3 px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-sm tabular-nums text-slate-100">{fmtDateTime(r.timestamp)}</span>
                    <StatusBadge status={r.status} />
                  </div>
                  <div>
                    <p className="text-sm text-slate-100">{r.location}</p>
                    <Direction direction={r.direction} />
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <PassTypePill>{r.passType}</PassTypePill>
                    <span className="text-xs text-slate-500">{r.device}</span>
                  </div>
                  {r.reason && <p className="text-xs text-slate-500">Motivo: {r.reason}</p>}
                </li>
              ))}
            </ul>

            {/* Paginação */}
            <div className="flex flex-col gap-3 border-t border-white/[0.08] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p className="text-sm text-slate-500">
                Mostrando <span className="text-slate-300">{rangeStart}–{rangeEnd}</span> de{' '}
                <span className="text-slate-300">{sorted.length}</span>{' '}
                {sorted.length === 1 ? 'registro' : 'registros'}
              </p>
              <div className="flex items-center justify-between gap-3 sm:justify-end">
                <button
                  type="button"
                  onClick={() => setPage(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className={btnPager}
                >
                  <i className="fas fa-chevron-left text-[10px]"></i>
                  Anterior
                </button>
                <span className="text-sm tabular-nums text-slate-500">
                  Página {currentPage} de {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className={btnPager}
                >
                  Próxima
                  <i className="fas fa-chevron-right text-[10px]"></i>
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg border border-white/[0.08] bg-brand-700 text-slate-500">
              <i className="fas fa-clock-rotate-left"></i>
            </div>
            <p className="mt-4 text-sm font-medium text-slate-100">Nenhum registro encontrado</p>
            <p className="mt-1 text-sm text-slate-500">
              {hasActiveFilters
                ? 'Ajuste a busca ou o filtro de status para ver outros acessos.'
                : 'Não há acessos registrados neste período.'}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className={`mt-5 rounded text-sm font-medium text-accent-muted transition-colors duration-200 hover:text-indigo-300 ${focusRing}`}
              >
                Limpar filtros
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
