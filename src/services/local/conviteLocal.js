import { getSession } from '../../auth';
import { ApiError } from '../api';
import { isValidCpf, isValidEmail, onlyDigits } from '../../utils/masks';
import { formatUnit } from '../../utils/residents';
import { LOCAL_AMBIENTES, ambienteNome, decisionOf, setDecision } from './inviteModel';
import { latency, nextId, transaction } from './localDb';

/* -------------------------------------------------------------------------- */
/*  Convites do MORADOR (localStorage), no mesmo banco da Portaria            */
/*  (db.invites): o que o morador cria aparece na fila da portaria.           */
/* -------------------------------------------------------------------------- */

const randomBlock = () => Math.random().toString(16).slice(2, 6).toUpperCase().padEnd(4, '0');

const generateCode = (db) => {
  let code;
  do {
    code = `MP-${randomBlock()}-${randomBlock()}-${randomBlock()}`;
  } while (db.invites.some((i) => i.code === code));
  return code;
};

/**
 * Morador logado -> cadastro de morador (por e-mail e depois por nome). Se o usuário de teste
 * ainda não existir no condomínio, ele é cadastrado (apenas no modo local).
 */
const residentOf = (db) => {
  const user = getSession()?.user ?? {};
  const email = String(user.email ?? '').toLowerCase();
  const name = String(user.name ?? '').trim().toLowerCase();
  let resident =
    db.residents.find((r) => r.email.toLowerCase() === email) ?? db.residents.find((r) => r.nome.trim().toLowerCase() === name);
  if (!resident) {
    resident = {
      id: nextId(db, 'residents'),
      nome: user.name || 'Morador',
      cpf: '39053344705',
      email: user.email || 'morador@email.com',
      telefone: '11999990000',
      bloco: 'B',
      unidade: '42',
      status: 'ativo',
    };
    db.residents.unshift(resident);
  }
  return resident;
};

const toView = (db, i) => {
  const resident = db.residents.find((r) => r.id === i.residentId);
  const decision = decisionOf(i);
  return {
    id: i.id,
    decision,
    guest: { name: i.guestName, cpf: i.guestCpf, email: i.guestEmail ?? '', phone: i.guestPhone ?? '' },
    ambiente: i.ambienteNome ?? ambienteNome(i.ambienteId),
    host: resident?.nome ?? '',
    unit: resident ? formatUnit(resident) : '',
    validFrom: i.validFrom,
    validUntil: i.validUntil,
    usos: i.usos ?? 0,
    usosMax: i.usosMax ?? 1,
    observacao: i.observacao ?? '',
    motivoRecusa: i.motivoRecusa ?? '',
    code: decision === 'aprovado' ? i.code : null, // QR só depois da aprovação
  };
};

export const listMeusConvites = async () => {
  await latency();
  return transaction((db) => {
    const resident = residentOf(db);
    return db.invites
      .filter((i) => i.residentId === resident.id)
      .sort((a, b) => (b.criadoEm ?? b.validFrom) - (a.criadoEm ?? a.validFrom))
      .map((i) => toView(db, i));
  });
};

export const listAmbientes = async () => {
  await latency(60);
  return LOCAL_AMBIENTES;
};

/** data: { guestName, guestCpf, guestEmail, guestPhone?, ambienteId, validFrom?, validUntil, usosMax?, observacao? } */
export const createConvite = async (data) => {
  await latency(250);
  return transaction((db) => {
    const now = Date.now();
    const errors = {};
    const guestName = String(data.guestName ?? '').trim().replace(/\s+/g, ' ');
    const validFrom = Number(data.validFrom ?? now);
    const validUntil = Number(data.validUntil);
    const phone = onlyDigits(data.guestPhone);

    if (guestName.length < 3) errors.guestName = 'Informe o nome do convidado.';
    if (!isValidCpf(data.guestCpf || '')) errors.guestCpf = 'Informe um CPF válido.';
    if (!isValidEmail(data.guestEmail || '')) errors.guestEmail = 'Informe um e-mail válido.';
    if (phone && (phone.length < 10 || phone.length > 11)) errors.guestPhone = 'Telefone deve ter 10 ou 11 dígitos.';
    if (!LOCAL_AMBIENTES.some((a) => a.id === Number(data.ambienteId))) errors.ambienteId = 'Selecione o ambiente.';
    if (!Number.isFinite(validUntil) || validUntil <= now) errors.validUntil = 'A expiração deve estar no futuro.';
    else if (validUntil <= validFrom) errors.validUntil = 'A expiração deve ser posterior ao início.';
    else if (validUntil - validFrom > 30 * 24 * 3600 * 1000) errors.validUntil = 'A validade máxima de um convite é de 30 dias.';
    if (Object.keys(errors).length) throw new ApiError(400, 'Confira os campos destacados.', errors);

    const resident = residentOf(db);
    if (resident.status === 'bloqueado') throw new ApiError(403, 'Morador bloqueado não pode criar convites.');

    const invite = {
      id: nextId(db, 'invites'),
      code: generateCode(db),
      residentId: resident.id,
      guestName,
      guestCpf: onlyDigits(data.guestCpf),
      guestEmail: String(data.guestEmail).trim(),
      guestPhone: phone,
      ambienteId: Number(data.ambienteId),
      ambienteNome: ambienteNome(data.ambienteId),
      validFrom,
      validUntil,
      usos: 0,
      usosMax: Number(data.usosMax) || 1,
      observacao: String(data.observacao ?? '').trim().slice(0, 255),
      criadoEm: now,
    };
    setDecision(invite, 'pendente'); // nasce aguardando a portaria
    db.invites.unshift(invite);
    return toView(db, invite);
  });
};

export const cancelarConvite = async (id) => {
  await latency(200);
  return transaction((db) => {
    const resident = residentOf(db);
    const invite = db.invites.find((i) => i.id === Number(id) && i.residentId === resident.id);
    if (!invite) throw new ApiError(404, 'Convite não encontrado.');
    const decision = decisionOf(invite);
    if (decision === 'recusado' || decision === 'cancelado' || invite.validUntil <= Date.now()) {
      throw new ApiError(409, 'Este convite não pode mais ser cancelado.');
    }
    setDecision(invite, 'cancelado');
    return toView(db, invite);
  });
};

