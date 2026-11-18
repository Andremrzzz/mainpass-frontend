import { ApiError } from '../api';
import { latency, nextId, read, transaction } from './localDb';
import { startOfToday } from '../../utils/dates';
import { isValidCpf, isValidEmail, onlyDigits } from '../../utils/masks';
import { formatUnit } from '../../utils/residents';

/* -------------------------------------------------------------------------- */
/*  Implementação LOCAL (localStorage) do serviço da portaria.                */
/*                                                                            */
/*  Mesma interface de portariaHttp.js: devolve as mesmas formas de dados e   */
/*  lança ApiError nos mesmos casos que a API REST. Regras de negócio que o   */
/*  servidor fará (unicidade, validade do convite, bloqueio) estão aqui só    */
/*  para o sistema funcionar sem back-end; apague esta pasta ao integrar.     */
/* -------------------------------------------------------------------------- */

const RESIDENT_FIELDS = ['nome', 'cpf', 'email', 'telefone', 'bloco', 'unidade', 'status'];

const sameCpf = (a, b) => onlyDigits(a) === onlyDigits(b);

const pickResidentFields = (data) => {
  const out = {};
  RESIDENT_FIELDS.forEach((f) => {
    if (data[f] !== undefined) out[f] = data[f];
  });
  if (out.cpf !== undefined) out.cpf = onlyDigits(out.cpf);
  if (out.telefone !== undefined) out.telefone = onlyDigits(out.telefone);
  if (out.email !== undefined) out.email = String(out.email).trim().toLowerCase();
  if (out.nome !== undefined) out.nome = String(out.nome).trim().replace(/\s+/g, ' ');
  return out;
};

/** Validação mínima (o servidor deve repetir e ampliar estas regras). */
const validateResident = (r) => {
  const errors = {};
  if (!r.nome || r.nome.length < 3) errors.nome = 'Informe o nome completo.';
  if (!isValidCpf(r.cpf || '')) errors.cpf = 'Informe um CPF válido.';
  if (!isValidEmail(r.email || '')) errors.email = 'Informe um e-mail válido.';
  if (!r.bloco) errors.bloco = 'Informe o bloco.';
  if (!r.unidade) errors.unidade = 'Informe a unidade.';
  if (!['ativo', 'bloqueado'].includes(r.status)) errors.status = 'Status inválido.';
  if (Object.keys(errors).length) throw new ApiError(400, 'Dados inválidos.', errors);
};

const assertUnique = (db, data, ignoreId = null) => {
  const errors = {};
  const others = db.residents.filter((r) => r.id !== ignoreId);
  if (others.some((r) => sameCpf(r.cpf, data.cpf))) errors.cpf = 'Já existe um morador com este CPF.';
  if (others.some((r) => r.email.toLowerCase() === data.email.toLowerCase())) {
    errors.email = 'Já existe um morador com este e-mail.';
  }
  if (Object.keys(errors).length) throw new ApiError(409, 'Não foi possível salvar: dados já cadastrados.', errors);
};

const findResident = (db, id) => db.residents.find((r) => r.id === Number(id));

const guestStatus = (invite, now) => {
  if (!invite.approved) return 'pendente';
  return invite.validUntil <= now ? 'expirado' : 'valido';
};

// Forma pública do convite (unidade e morador sempre atuais, vindos do cadastro)
const toInviteView = (db, invite) => {
  const resident = findResident(db, invite.residentId);
  return {
    id: invite.id,
    code: invite.code,
    guestName: invite.guestName,
    guestCpf: invite.guestCpf,
    unit: resident ? formatUnit(resident) : '—',
    host: resident ? resident.nome : '—',
    validFrom: invite.validFrom,
    validUntil: invite.validUntil,
  };
};

const randomBlock = () => {
  const bytes = new Uint8Array(2);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes);
  else bytes.forEach((_, i) => { bytes[i] = Math.floor(Math.random() * 256); });
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
};

const generateCode = (db) => {
  let code;
  do {
    code = `MP-${randomBlock()}-${randomBlock()}-${randomBlock()}`;
  } while (db.invites.some((i) => i.code === code));
  return code;
};

const normalizeCode = (code) => String(code ?? '').trim().toUpperCase();

/* --------------------------------- Saúde ---------------------------------- */
export const checkHealth = async () => ({ status: 'UP', storage: 'localStorage' });

/* --------------------------------- Resumo --------------------------------- */
export const getResumo = async () => {
  await latency();
  return read((db) => {
    const today = startOfToday();

    // Visitante está "dentro" quando seu último evento permitido foi uma entrada
    const lastEvent = new Map();
    [...db.accessLogs]
      .filter((l) => l.personType === 'visitante' && l.status === 'permitido')
      .sort((a, b) => a.timestamp - b.timestamp)
      .forEach((l) => lastEvent.set(l.document, l.direction));

    return {
      acessosHoje: db.accessLogs.filter((l) => l.timestamp >= today && l.status === 'permitido' && l.direction === 'entrada').length,
      visitantesAgora: [...lastEvent.values()].filter((d) => d === 'entrada').length,
      moradores: db.residents.length,
      chamadosAbertos: db.tickets.filter((t) => t.status === 'aberto').length,
    };
  });
};

/* --------------------------------- Acessos -------------------------------- */
export const listAcessos = async () => {
  await latency();
  return read((db) => db.accessLogs);
};

/**
 * Valida um QR Code lido na portaria e REGISTRA o resultado no histórico
 * (inclusive as tentativas negadas). Uma negativa não lança erro: é um
 * resultado normal. Saída é permitida para qualquer código conhecido.
 * Retorna { allowed, status, reason, log }.
 */
export const validarConvite = async ({ code, direction = 'entrada' }) => {
  await latency();
  return transaction((db) => {
    const now = Date.now();
    const invite = db.invites.find((i) => i.code === normalizeCode(code));
    const resident = invite ? findResident(db, invite.residentId) : null;

    let status = 'permitido';
    let reason = '';

    if (!invite) {
      status = 'negado';
      reason = 'QR Code inválido';
    } else if (direction === 'entrada') {
      if (!invite.approved) {
        status = 'negado';
        reason = 'Convite não aprovado pelo morador';
      } else if (invite.validFrom > now) {
        status = 'negado';
        reason = 'Fora do horário permitido';
      } else if (invite.validUntil <= now) {
        status = 'expirado';
        reason = 'Passe expirado';
      } else if (resident?.status === 'bloqueado') {
        status = 'negado';
        reason = 'Conta do morador bloqueada';
      }
    }

    const log = {
      id: `AC-${String(nextId(db, 'access')).padStart(4, '0')}`,
      timestamp: now,
      personName: invite ? invite.guestName : 'Não identificado',
      personType: 'visitante',
      document: invite ? invite.guestCpf : '',
      unit: resident ? formatUnit(resident) : '—',
      host: resident ? resident.nome : '—',
      direction,
      status,
      reason,
    };
    db.accessLogs.unshift(log);

    return { allowed: status === 'permitido', status, reason, log };
  });
};

/* -------------------------------- Moradores ------------------------------- */
export const listMoradores = async () => {
  await latency();
  return read((db) => db.residents);
};

export const getMorador = async (id) => {
  await latency();
  return read((db) => {
    const resident = findResident(db, id);
    if (!resident) throw new ApiError(404, 'Morador não encontrado.');
    const now = Date.now();
    const convidados = db.invites
      .filter((i) => i.residentId === resident.id)
      .sort((a, b) => b.validUntil - a.validUntil)
      .map((i) => ({ id: i.id, nome: i.guestName, cpf: i.guestCpf, validade: i.validUntil, status: guestStatus(i, now) }));
    return { ...resident, convidados };
  });
};

export const createMorador = async (data) => {
  await latency(250);
  return transaction((db) => {
    const clean = { status: 'ativo', ...pickResidentFields(data) };
    validateResident(clean);
    assertUnique(db, clean);
    const created = { id: nextId(db, 'residents'), ...clean };
    db.residents.unshift(created);
    return created;
  });
};

export const updateMorador = async (id, data) => {
  await latency(250);
  return transaction((db) => {
    const index = db.residents.findIndex((r) => r.id === Number(id));
    if (index === -1) throw new ApiError(404, 'Morador não encontrado.');
    const merged = { ...db.residents[index], ...pickResidentFields(data), id: Number(id) };
    validateResident(merged);
    assertUnique(db, merged, merged.id);
    db.residents[index] = merged;
    return merged;
  });
};

/* --------------------------------- Convites ------------------------------- */
export const listConvitesAtivos = async () => {
  await latency();
  return read((db) => {
    const now = Date.now();
    return db.invites
      .filter((i) => i.approved && i.validFrom <= now && i.validUntil > now)
      .sort((a, b) => a.validUntil - b.validUntil)
      .map((i) => toInviteView(db, i));
  });
};

/**
 * Gera um convite (QR Code) para um convidado de um morador.
 * data: { residentId, guestName, guestCpf, validFrom?, validUntil, approved? }
 * O código é gerado aqui (no servidor real também deve ser).
 */
export const createConvite = async (data) => {
  await latency(250);
  return transaction((db) => {
    const now = Date.now();
    const errors = {};
    const resident = findResident(db, data.residentId);
    const guestName = String(data.guestName ?? '').trim().replace(/\s+/g, ' ');
    const validFrom = Number(data.validFrom ?? now);
    const validUntil = Number(data.validUntil);

    if (!resident) errors.residentId = 'Morador não encontrado.';
    else if (resident.status === 'bloqueado') errors.residentId = 'Morador bloqueado não pode gerar convites.';
    if (guestName.length < 3) errors.guestName = 'Informe o nome do convidado.';
    if (!isValidCpf(data.guestCpf || '')) errors.guestCpf = 'Informe um CPF válido.';
    if (!Number.isFinite(validUntil) || validUntil <= validFrom) errors.validUntil = 'A validade deve ser posterior ao início.';
    else if (validUntil <= now) errors.validUntil = 'A validade já passou.';
    if (Object.keys(errors).length) throw new ApiError(400, 'Dados inválidos.', errors);

    const invite = {
      id: nextId(db, 'invites'),
      code: generateCode(db),
      residentId: resident.id,
      guestName,
      guestCpf: onlyDigits(data.guestCpf),
      validFrom,
      validUntil,
      approved: data.approved !== false,
    };
    db.invites.unshift(invite);
    return toInviteView(db, invite);
  });
};

/* --------------------------------- Chamados ------------------------------- */
export const listChamados = async () => {
  await latency();
  return read((db) => [...db.tickets].sort((a, b) => b.criadoEm - a.criadoEm));
};

/** data: { residentId, assunto, mensagem } */
export const createChamado = async (data) => {
  await latency(250);
  return transaction((db) => {
    const errors = {};
    const resident = findResident(db, data.residentId);
    const assunto = String(data.assunto ?? '').trim();
    const mensagem = String(data.mensagem ?? '').trim();
    if (!resident) errors.residentId = 'Morador não encontrado.';
    if (assunto.length < 3) errors.assunto = 'Informe o assunto.';
    if (mensagem.length < 5) errors.mensagem = 'Descreva o problema.';
    if (Object.keys(errors).length) throw new ApiError(400, 'Dados inválidos.', errors);

    const ticket = {
      id: nextId(db, 'tickets'),
      residentId: resident.id,
      morador: resident.nome,
      unidade: formatUnit(resident),
      assunto,
      mensagem,
      criadoEm: Date.now(),
      status: 'aberto',
    };
    db.tickets.unshift(ticket);
    return ticket;
  });
};

export const resolverChamado = async (id) => {
  await latency(200);
  return transaction((db) => {
    const index = db.tickets.findIndex((t) => t.id === Number(id));
    if (index === -1) throw new ApiError(404, 'Chamado não encontrado.');
    db.tickets[index] = { ...db.tickets[index], status: 'resolvido' };
    return db.tickets[index];
  });
};
