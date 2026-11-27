import { ApiError, request } from './api';
import { AMBIENTE_ID } from './env';

/* -------------------------------------------------------------------------- */
/*  Convites do MORADOR (API REST)                                            */
/*    GET   /api/convites?size=            lista os convites do morador       */
/*    POST  /api/convites                  cria (nasce PENDENTE_APROVACAO)    */
/*    PATCH /api/convites/{id}/cancelar                                       */
/*    GET   /api/ambientes                 (opcional; veja listAmbientes)     */
/* -------------------------------------------------------------------------- */

const digits = (v) => String(v ?? '').replace(/\D/g, '');
const toMs = (v) => {
  if (v == null) return null;
  const t = typeof v === 'number' ? v : Date.parse(v);
  return Number.isNaN(t) ? null : t;
};

// ATIVO/EXPIRADO/UTILIZADO vêm de convites já aprovados pela portaria
const DECISION = {
  PENDENTE_APROVACAO: 'pendente',
  RECUSADO: 'recusado',
  ATIVO: 'aprovado',
  EXPIRADO: 'aprovado',
  UTILIZADO: 'utilizado',
  CANCELADO: 'cancelado',
};

const toConvite = (c) => ({
  id: c.id,
  decision: DECISION[String(c.status).toUpperCase()] ?? 'pendente',
  guest: { name: c.convidadoNome ?? '—', cpf: '', email: c.convidadoEmail ?? '', phone: digits(c.convidadoTelefone) },
  ambiente: c.ambienteNome ?? '',
  host: '',
  validFrom: toMs(c.dataInicio) ?? 0,
  validUntil: toMs(c.dataFim) ?? 0,
  usos: c.usos ?? 0,
  usosMax: c.usosMax ?? 1,
  observacao: c.observacao ?? '',
  motivoRecusa: c.motivoRecusa ?? '',
  // Token (QR Code) só existe enquanto ATIVO: nunca é gerado para pendente/recusado
  code: c.token ?? null,
  senhaProvisoria: c.senhaProvisoria ?? null,
});

export const listMeusConvites = async () => {
  const page = await request('/api/convites?size=50');
  return (page?.content ?? page ?? []).map(toConvite);
};

// Campos da API -> campos do formulário
const FIELD_MAP = {
  'convidado.nome': 'guestName',
  'convidado.cpf': 'guestCpf',
  'convidado.email': 'guestEmail',
  'convidado.telefone': 'guestPhone',
  dataFim: 'validUntil',
  dataInicio: 'validFrom',
  ambienteId: 'ambienteId',
  usosMax: 'usosMax',
  observacao: 'observacao',
};

export const createConvite = async (data) => {
  const body = {
    convidado: {
      nome: data.guestName,
      email: data.guestEmail,
      cpf: digits(data.guestCpf),
      telefone: digits(data.guestPhone) || null,
    },
    ambienteId: Number(data.ambienteId),
    dataInicio: data.validFrom ? new Date(data.validFrom).toISOString() : null,
    dataFim: new Date(data.validUntil).toISOString(),
    usosMax: Number(data.usosMax) || 1,
    observacao: data.observacao?.trim() || null,
  };
  try {
    return toConvite(await request('/api/convites', { method: 'POST', body }));
  } catch (err) {
    if (err instanceof ApiError && err.fieldErrors) {
      const mapped = {};
      Object.entries(err.fieldErrors).forEach(([k, v]) => {
        mapped[FIELD_MAP[k] ?? k] = v;
      });
      throw new ApiError(err.status, err.message, mapped);
    }
    throw err;
  }
};

export const cancelarConvite = async (id) => toConvite(await request(`/api/convites/${id}/cancelar`, { method: 'PATCH' }));

/**
 * O back-end ainda não expõe a lista de ambientes (a entidade Ambiente não faz parte deste pacote).
 * Tenta GET /api/ambientes; sem ele, usa o ambiente configurado em VITE_AMBIENTE_ID.
 */
export const listAmbientes = async () => {
  try {
    const list = await request('/api/ambientes');
    const items = (Array.isArray(list) ? list : list?.content ?? []).map((a) => ({ id: a.id, nome: a.nome ?? `Ambiente ${a.id}` }));
    if (items.length) return items;
  } catch {
    /* sem endpoint: usa o ambiente configurado */
  }
  if (AMBIENTE_ID) return [{ id: AMBIENTE_ID, nome: 'Portaria principal' }];
  throw new ApiError(0, 'Nenhum ambiente configurado (defina VITE_AMBIENTE_ID ou crie GET /api/ambientes).');
};
