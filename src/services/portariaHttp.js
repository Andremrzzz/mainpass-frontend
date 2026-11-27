import { ApiError, request } from './api';
import { AMBIENTE_ID, PERFIL_MORADOR } from './env';
import { startOfToday } from '../utils/dates';

/* -------------------------------------------------------------------------- */
/*  Driver HTTP: adapta a API Spring Boot (br.mainpass.acesso) ao contrato    */
/*  que as telas esperam. É a "camada anticorrupção": o vocabulário da API    */
/*  (Usuario, QrCode, RegistroAcesso) é traduzido aqui para o da interface    */
/*  (morador, convite, acesso). As telas não conhecem os nomes do back-end.   */
/*                                                                            */
/*  Diferenças tratadas neste arquivo:                                        */
/*   - datas ISO (Instant) -> milissegundos; enums MAIÚSCULOS -> minúsculos;  */
/*   - listagens paginadas (Page) -> arrays;                                  */
/*   - Usuario.ativo (boolean) <-> status 'ativo' | 'bloqueado'.              */
/*                                                                            */
/*  CONTRATO ASSUMIDO (confira com os DTOs reais; os trechos marcados com     */
/*  "CONFIRMAR" foram escritos sem ver o código do back-end):                 */
/*   - RegistroAcessoResponse / ValidarAcessoResponse: campos lidos com       */
/*     alternativas em pick(...); ajuste as chaves se forem outras.           */
/*   - /api/usuarios (UsuarioController): lista/CRUD de moradores.            */
/*   - GET /api/qrcodes?status=ATIVO: endpoint a criar (ADMIN/OPERADOR).      */
/* -------------------------------------------------------------------------- */

const PAGE_ALL = 1000; // enquanto as telas filtram no navegador (Pageable máx. padrão: 2000)

/** O que este driver suporta; as telas escondem o que não existe. */
export const capabilities = {
  // O back-end gera QR Codes só para o usuário logado (POST /api/qrcodes { ambienteId }),
  // sem convidado/validade informados pela portaria.
  criarConvite: false,
  // Fila de aprovação de convites (GET/POST /api/portaria/convites/...)
  solicitacoes: true,
};

/* ------------------------------- Utilitários ------------------------------- */

// Primeiro valor presente entre várias chaves possíveis
const pick = (obj, ...keys) => {
  for (const key of keys) {
    const value = obj?.[key];
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
};

const toMs = (value) => {
  if (value === undefined || value === null) return null;
  if (typeof value === 'number') return value;
  const t = Date.parse(value);
  return Number.isNaN(t) ? null : t;
};

const digits = (value) => String(value ?? '').replace(/\D/g, '');

// "000.000.000-00" (a coluna Usuario.cpf tem 14 posições)
const formatCpf = (value) => {
  const d = digits(value);
  return d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : d;
};

const unwrapList = (payload) => (Array.isArray(payload) ? payload : payload?.content ?? []);

// MOTIVO_EXPIRADO -> "Motivo expirado"
const MOTIVOS = {
  PENDENTE_APROVACAO: 'Convite aguardando aprovação da portaria',
  RECUSADO: 'Convite recusado pela portaria',
  CANCELADO: 'Convite cancelado',
  JA_UTILIZADO: 'Convite já utilizado',
  AINDA_NAO_VALIDO: 'Fora do horário permitido',
  AMBIENTE_NAO_AUTORIZADO: 'Ambiente não autorizado para este convite',
};

const humanize = (value) => {
  const text = String(value ?? '').trim();
  if (!text) return '';
  if (MOTIVOS[text.toUpperCase()]) return MOTIVOS[text.toUpperCase()];
  const lower = text.replace(/_/g, ' ').toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
};

const unitOf = (source) => {
  const bloco = pick(source, 'bloco');
  const unidade = pick(source, 'unidade');
  return unidade && bloco ? `${unidade} · Bloco ${bloco}` : null;
};

const ambienteName = (source) => {
  const a = source?.ambiente;
  return pick(source, 'ambienteNome') ?? (typeof a === 'object' ? a?.nome : a);
};

/* --------------------------------- Saúde ---------------------------------- */
// Spring Boot Actuator (já liberado no SecurityConfig)
export const checkHealth = () => request('/actuator/health', { timeoutMs: 5000 });

/* --------------------------------- Acessos -------------------------------- */
const toAccessStatus = (resultado, motivo) => {
  const r = String(resultado ?? '').toUpperCase();
  const m = String(motivo ?? '').toUpperCase();
  if (['PERMITIDO', 'AUTORIZADO', 'LIBERADO', 'SUCESSO'].includes(r)) return 'permitido';
  return m.includes('EXPIR') ? 'expirado' : 'negado';
};

// RegistroAcessoResponse -> linha do histórico (CONFIRMAR nomes dos campos)
const toAcesso = (r) => {
  const usuario = r.usuario ?? {};
  const personName = pick(r, 'usuarioNome', 'nomeUsuario', 'nome') ?? usuario.nome ?? 'Não identificado';
  const motivo = pick(r, 'motivo', 'motivoRecusa');
  const direction = String(pick(r, 'tipo', 'direcao', 'direction') ?? '').toLowerCase();

  return {
    id: r.id,
    timestamp: toMs(pick(r, 'dataHora', 'criadoEm')) ?? 0,
    personName,
    personType: 'morador',
    document: digits(pick(r, 'usuarioCpf', 'cpf') ?? usuario.cpf),
    unit: unitOf(r) ?? unitOf(usuario) ?? ambienteName(r) ?? '—',
    host: personName,
    direction: direction === 'saida' || direction === 'saída' ? 'saida' : 'entrada',
    status: toAccessStatus(pick(r, 'resultado', 'status'), motivo),
    reason: humanize(motivo),
  };
};

export const listAcessos = async () => {
  const page = await request(`/api/acessos?size=${PAGE_ALL}&sort=dataHora,desc`);
  return unwrapList(page).map(toAcesso);
};

// ValidarAcessoResponse -> { allowed, status, reason, log } (CONFIRMAR nomes dos campos)
const toValidacao = (r) => {
  const motivo = pick(r, 'motivo', 'motivoRecusa');
  const status = toAccessStatus(pick(r, 'resultado', 'status'), motivo);
  const allowed = pick(r, 'permitido', 'autorizado', 'allowed') ?? status === 'permitido';
  return {
    allowed: Boolean(allowed),
    status,
    reason: humanize(motivo) || pick(r, 'mensagem', 'message') || '',
    log: toAcesso(r.registro ?? r),
  };
};

// Erros de negócio em que o back-end recusa o QR com 4xx viram "acesso negado" (não falha de sistema)
const DENIAL_STATUS = [400, 404, 409, 410, 422];

/** O back-end não recebe sentido (entrada/saída): valida token + ambiente da portaria. */
export const validarConvite = async ({ code }) => {
  if (!AMBIENTE_ID) {
    throw new ApiError(400, 'Ambiente da portaria não configurado. Defina VITE_AMBIENTE_ID no .env.');
  }
  try {
    const response = await request('/api/acessos/validar', {
      method: 'POST',
      body: { token: String(code ?? '').trim(), ambienteId: AMBIENTE_ID },
    });
    return toValidacao(response);
  } catch (err) {
    if (err instanceof ApiError && DENIAL_STATUS.includes(err.status)) {
      return { allowed: false, status: 'negado', reason: err.message, log: null };
    }
    throw err;
  }
};

/* -------------------------------- Moradores ------------------------------- */
// CONFIRMAR: rota e DTOs do UsuarioController
const USERS = '/api/usuarios';

const toMorador = (u) => ({
  id: u.id,
  nome: u.nome,
  cpf: digits(u.cpf),
  email: u.email,
  telefone: digits(u.telefone),
  bloco: u.bloco ?? '',
  unidade: u.unidade ?? '',
  status: u.ativo === false ? 'bloqueado' : 'ativo',
});

// OBS.: Usuario.senhaHash é obrigatório. O back-end precisa gerar uma senha provisória
// (ou fluxo de primeiro acesso) ao receber o cadastro sem `senha`.
const toUserPayload = (m) => ({
  nome: m.nome,
  cpf: formatCpf(m.cpf),
  email: m.email,
  telefone: digits(m.telefone),
  bloco: m.bloco,
  unidade: m.unidade,
  perfil: PERFIL_MORADOR,
  ativo: m.status !== 'bloqueado',
});

// Consulta da portaria (somente leitura): GET /api/portaria/moradores[?q=&page=&size=] e /{id}
const PORTARIA_MORADORES = '/api/portaria/moradores';
const PORTARIA_PAGE_SIZE = 100; // máximo aceito pelo back-end
const PORTARIA_MAX_PAGES = 20;

/** Status do convite (back-end) -> status do convidado exibido na tela. */
const toGuestStatus = (c) => {
  const status = String(c.status ?? '').toUpperCase();
  if (status === 'ATIVO') {
    // Defensivo: o back já devolve EXPIRADO, mas não dependemos disso.
    if (c.dataFim && toMs(c.dataFim) < Date.now()) return 'expirado';
    return toMs(c.dataInicio) > Date.now() ? 'agendado' : 'valido';
  }
  if (status === 'PENDENTE_APROVACAO') {
    return c.dataFim && toMs(c.dataFim) < Date.now() ? 'expirado' : 'pendente';
  }
  if (status === 'RECUSADO') return 'recusado';
  if (status === 'UTILIZADO') return 'utilizado';
  if (status === 'CANCELADO') return 'cancelado';
  return 'expirado';
};

const toConvidado = (c) => ({
  id: c.conviteId,
  nome: c.convidadoNome,
  cpf: digits(c.convidadoCpf),
  validade: toMs(c.dataFim),
  status: toGuestStatus(c),
  ambiente: c.ambienteNome ?? '',
  usos: c.usos,
  usosMax: c.usosMax,
});

/** Todos os moradores (percorre as páginas; a busca e os filtros são feitos na tela). */
export const listMoradores = async () => {
  const all = [];
  for (let page = 0; page < PORTARIA_MAX_PAGES; page += 1) {
    const res = await request(`${PORTARIA_MORADORES}?size=${PORTARIA_PAGE_SIZE}&page=${page}`);
    all.push(...unwrapList(res).map(toMorador));
    if (res.last !== false) break; // Page do Spring: `last` indica a última página
  }
  return all;
};

/** Morador + convidados (convites) numa única chamada. */
export const getMorador = async (id) => {
  const res = await request(`${PORTARIA_MORADORES}/${id}`);
  return { ...toMorador(res.morador), convidados: (res.convidados ?? []).map(toConvidado) };
};

export const createMorador = async (data) =>
  toMorador(await request(USERS, { method: 'POST', body: toUserPayload(data) }));

export const updateMorador = async (id, data) =>
  toMorador(await request(`${USERS}/${id}`, { method: 'PUT', body: toUserPayload(data) }));

/* --------------------------------- Convites ------------------------------- */
// QrCode do back-end = credencial de um usuário para um ambiente.
// ENDPOINT A CRIAR (ADMIN/OPERADOR): GET /api/qrcodes?status=ATIVO -> Page de
//   { id, ambienteId, ambienteNome, status, criadoEm, expiraEm,
//     usuarioId, usuarioNome, usuarioCpf, usuarioBloco, usuarioUnidade }
// O token nunca é devolvido depois da geração, então `code` é nulo.
const toConvite = (q) => {
  const nome = pick(q, 'usuarioNome', 'nomeUsuario') ?? q.usuario?.nome ?? '—';
  const unit =
    unitOf({ bloco: pick(q, 'usuarioBloco'), unidade: pick(q, 'usuarioUnidade') }) ??
    unitOf(q.usuario ?? {}) ??
    ambienteName(q) ??
    '—';
  return {
    id: q.id,
    code: null,
    guestName: nome,
    guestCpf: digits(pick(q, 'usuarioCpf') ?? q.usuario?.cpf),
    unit,
    host: nome,
    validFrom: toMs(pick(q, 'criadoEm', 'emitidoEm')) ?? 0,
    validUntil: toMs(q.expiraEm) ?? 0,
  };
};

export const listConvitesAtivos = async () => {
  const page = await request(`/api/qrcodes?status=ATIVO&size=${PAGE_ALL}&sort=expiraEm,asc`);
  return unwrapList(page).map(toConvite);
};

export const createConvite = async () => {
  throw new ApiError(
    501,
    'O back-end ainda não gera convites para convidados (POST /api/qrcodes cria o QR do usuário logado).'
  );
};

/* ------------------------- Fila de solicitações (aprovação) ---------------- */
// Pacote br.mainpass.acesso.portaria (somente OPERADOR/ADMIN)
//   GET  /api/portaria/convites/pendentes
//   POST /api/portaria/convites/{id}/aprovar
//   POST /api/portaria/convites/{id}/recusar   { motivo? }
const PORTARIA_CONVITES = '/api/portaria/convites';

const toSolicitacao = (s) => ({
  id: s.conviteId,
  status: String(s.status ?? '').toUpperCase() === 'PENDENTE_APROVACAO' ? 'pendente' : String(s.status ?? '').toLowerCase(),
  guestName: s.convidado?.nome ?? '—',
  guestCpf: digits(s.convidado?.cpf),
  guestEmail: s.convidado?.email ?? '',
  guestPhone: digits(s.convidado?.telefone),
  host: s.morador?.nome ?? '—',
  unit: unitOf({ bloco: s.morador?.bloco, unidade: s.morador?.unidade }) ?? '—',
  ambiente: s.ambienteNome ?? '',
  validFrom: toMs(s.dataInicio) ?? 0,
  validUntil: toMs(s.dataFim) ?? 0,
  usosMax: s.usosMax ?? 1,
  observacao: s.observacao ?? '',
  criadoEm: toMs(s.criadoEm) ?? 0,
  motivoRecusa: s.motivoRecusa ?? '',
});

export const listSolicitacoes = async () => {
  const list = await request(`${PORTARIA_CONVITES}/pendentes`);
  return (Array.isArray(list) ? list : unwrapList(list)).map(toSolicitacao);
};

export const aprovarSolicitacao = async (id) =>
  toSolicitacao(await request(`${PORTARIA_CONVITES}/${id}/aprovar`, { method: 'POST' }));

export const recusarSolicitacao = async (id, motivo) =>
  toSolicitacao(await request(`${PORTARIA_CONVITES}/${id}/recusar`, { method: 'POST', body: { motivo: motivo || null } }));

/* --------------------------------- Chamados ------------------------------- */
// Pacote br.mainpass.acesso.chamado
const toChamado = (c) => ({
  id: c.id,
  morador: c.solicitanteNome ?? '—',
  unidade: unitOf({ bloco: c.solicitanteBloco, unidade: c.solicitanteUnidade }) ?? '—',
  assunto: c.assunto,
  mensagem: c.mensagem,
  criadoEm: toMs(c.criadoEm) ?? 0,
  status: String(c.status).toUpperCase() === 'RESOLVIDO' ? 'resolvido' : 'aberto',
});

export const listChamados = async () => {
  const page = await request(`/api/chamados?size=${PAGE_ALL}&sort=criadoEm,desc`);
  return unwrapList(page).map(toChamado);
};

/** O solicitante é o usuário do token: `residentId` não é enviado. */
export const createChamado = async ({ assunto, mensagem }) =>
  toChamado(await request('/api/chamados', { method: 'POST', body: { assunto, mensagem } }));

export const resolverChamado = async (id) =>
  toChamado(await request(`/api/chamados/${id}/resolver`, { method: 'PUT' }));

/* --------------------------------- Resumo --------------------------------- */
// Sem endpoint dedicado: usa totalElements das páginas (size=1) e deixa "—" no que não dá para calcular.
const totalOf = (path) =>
  request(path)
    .then((page) => (Array.isArray(page) ? page.length : page?.totalElements ?? null))
    .catch(() => null);

export const getResumo = async () => {
  const hoje = encodeURIComponent(new Date(startOfToday()).toISOString());
  const [acessosHoje, moradores, chamadosAbertos] = await Promise.all([
    totalOf(`/api/acessos?resultado=PERMITIDO&de=${hoje}&size=1`),
    request(`${PORTARIA_MORADORES}?size=1`).then((p) => p.totalElements ?? null).catch(() => null),
    totalOf('/api/chamados?status=ABERTO&size=1'),
  ]);
  // visitantesAgora exige saber o sentido (entrada/saída) de cada registro: indisponível por enquanto
  return { acessosHoje, visitantesAgora: null, moradores, chamadosAbertos };
};
