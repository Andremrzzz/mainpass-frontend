import { ApiError } from './api';
import { startOfToday } from '../utils/dates';

/* -------------------------------------------------------------------------- */
/*  MODO DEMONSTRAÇÃO: simula a API da portaria com dados fictícios em        */
/*  memória (reiniciam ao recarregar a página). Remova este arquivo quando a  */
/*  API real estiver integrada.                                               */
/* -------------------------------------------------------------------------- */

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const NOW = Date.now();

const delay = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms + Math.random() * 250));

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

// Gera um CPF válido (com dígitos verificadores) a partir de 9 dígitos-base
const cpf = (base) => {
  const d = String(base).padStart(9, '0').split('').map(Number);
  const dv = (len) => {
    let sum = 0;
    for (let i = 0; i < len; i += 1) sum += d[i] * (len + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  d.push(dv(9));
  d.push(dv(10));
  return d.join('');
};

const clone = (v) => JSON.parse(JSON.stringify(v));

/* ------------------------------- Moradores -------------------------------- */
let residents = [
  { id: 1, nome: 'Mariana Souza', cpf: cpf(123456789), email: 'mariana.souza@email.com', telefone: '11987654321', bloco: 'B', unidade: '42', status: 'ativo' },
  { id: 2, nome: 'Roberto Almeida', cpf: cpf(234567891), email: 'roberto.almeida@email.com', telefone: '11976543210', bloco: 'A', unidade: '101', status: 'ativo' },
  { id: 3, nome: 'Juliana Prado', cpf: cpf(345678912), email: 'juliana.prado@email.com', telefone: '11965432109', bloco: 'C', unidade: '15', status: 'ativo' },
  { id: 4, nome: 'Helena Duarte', cpf: cpf(456789123), email: 'helena.duarte@email.com', telefone: '21998761234', bloco: 'A', unidade: '203', status: 'ativo' },
  { id: 5, nome: 'Paulo Ricardo Mendes', cpf: cpf(567891234), email: 'paulo.mendes@email.com', telefone: '11954321098', bloco: 'B', unidade: '304', status: 'bloqueado' },
  { id: 6, nome: 'Beatriz Carvalho', cpf: cpf(678912345), email: 'beatriz.carvalho@email.com', telefone: '11943210987', bloco: 'C', unidade: '12', status: 'ativo' },
  { id: 7, nome: 'Thiago Nogueira', cpf: cpf(789123456), email: 'thiago.nogueira@email.com', telefone: '11932109876', bloco: 'A', unidade: '501', status: 'ativo' },
  { id: 8, nome: 'Camila Ferreira', cpf: cpf(891234567), email: 'camila.ferreira@email.com', telefone: '11921098765', bloco: 'B', unidade: '88', status: 'ativo' },
  { id: 9, nome: 'André Luiz Barbosa', cpf: cpf(912345678), email: 'andre.barbosa@email.com', telefone: '11910987654', bloco: 'C', unidade: '21', status: 'ativo' },
  { id: 10, nome: 'Patrícia Gomes', cpf: cpf(135792468), email: 'patricia.gomes@email.com', telefone: '11999887766', bloco: 'B', unidade: '402', status: 'ativo' },
  { id: 11, nome: 'Ricardo Tavares', cpf: cpf(246813579), email: 'ricardo.tavares@email.com', telefone: '11988776655', bloco: 'A', unidade: '105', status: 'ativo' },
  { id: 12, nome: 'Luciana Martins', cpf: cpf(357924681), email: 'luciana.martins@email.com', telefone: '11977665544', bloco: 'A', unidade: '302', status: 'ativo' },
  { id: 13, nome: 'Fábio Teixeira', cpf: cpf(468135792), email: 'fabio.teixeira@email.com', telefone: '11966554433', bloco: 'C', unidade: '77', status: 'bloqueado' },
  { id: 14, nome: 'Sônia Albuquerque', cpf: cpf(579246813), email: 'sonia.albuquerque@email.com', telefone: '11955443322', bloco: 'B', unidade: '601', status: 'ativo' },
];

const guestsByResident = {
  1: [
    { id: 101, nome: 'Carlos Eduardo Lima', cpf: cpf(321654987), validade: NOW + 30 * HOUR, status: 'valido' },
    { id: 102, nome: 'Lucas Martins', cpf: cpf(654987321), validade: NOW - 24 * HOUR, status: 'expirado' },
  ],
  2: [{ id: 103, nome: 'Fernanda Oliveira', cpf: cpf(987321654), validade: NOW + 5 * DAY, status: 'valido' }],
  3: [{ id: 104, nome: 'Pedro Henrique Santos', cpf: cpf(147258369), validade: NOW + 48 * HOUR, status: 'pendente' }],
  4: [
    { id: 105, nome: 'Marcos Vinícius Rocha', cpf: cpf(258369147), validade: NOW + 6 * HOUR, status: 'valido' },
    { id: 106, nome: 'Aline Cardoso', cpf: cpf(369147258), validade: NOW - 3 * DAY, status: 'expirado' },
  ],
  6: [{ id: 107, nome: 'Gustavo Pereira', cpf: cpf(741852963), validade: NOW + 3 * DAY, status: 'valido' }],
};

/* ----------------------------- Histórico de acessos ----------------------- */
const VISITORS = [
  { nome: 'Carlos Eduardo Lima', cpf: cpf(321654987) },
  { nome: 'Fernanda Oliveira', cpf: cpf(987321654) },
  { nome: 'Marcos Vinícius Rocha', cpf: cpf(258369147) },
  { nome: 'Gustavo Pereira', cpf: cpf(741852963) },
  { nome: 'Lucas Martins', cpf: cpf(654987321) },
  { nome: 'Aline Cardoso', cpf: cpf(369147258) },
  { nome: 'Entregador iFood', cpf: cpf(852963741) },
  { nome: 'Técnico de Internet', cpf: cpf(963741852) },
  { nome: 'Diarista Maria José', cpf: cpf(159753486) },
  { nome: 'Rafael Moura', cpf: cpf(486159753) },
];

const DENIALS = [
  { status: 'expirado', reason: 'Passe expirado' },
  { status: 'negado', reason: 'QR Code inválido' },
  { status: 'negado', reason: 'Fora do horário permitido' },
  { status: 'negado', reason: 'Convite não aprovado pelo morador' },
];

const unitLabel = (r) => `${r.unidade} · Bloco ${r.bloco}`;

const buildAccessLogs = () => {
  const rand = mulberry32(20261112);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const logs = [];
  const push = (log) => logs.push({ id: `AC-${String(logs.length + 1).padStart(4, '0')}`, ...log });
  const base = residents.slice(0, 14);

  // Visitas (entrada e, quando já saíram, saída)
  for (let i = 0; i < 80; i += 1) {
    const visitor = pick(VISITORS);
    const host = pick(base);
    const recent = i < 14;
    const entry = NOW - (recent ? rand() * 9 * HOUR : 10 * HOUR + rand() * 29 * DAY);
    const common = {
      personName: visitor.nome,
      personType: 'visitante',
      document: visitor.cpf,
      unit: unitLabel(host),
      host: host.nome,
    };

    if (rand() < 0.14) {
      const denial = pick(DENIALS);
      push({ ...common, timestamp: entry, direction: 'entrada', status: denial.status, reason: denial.reason });
      continue;
    }

    push({ ...common, timestamp: entry, direction: 'entrada', status: 'permitido', reason: '' });
    const exit = entry + (30 + rand() * 150) * MIN;
    if (!recent || exit < NOW) {
      push({ ...common, timestamp: exit, direction: 'saida', status: 'permitido', reason: '' });
    }
  }

  // Passagens de moradores
  for (let i = 0; i < 40; i += 1) {
    const r = pick(base);
    const common = { personName: r.nome, personType: 'morador', document: r.cpf, unit: unitLabel(r), host: r.nome };
    const ts = NOW - rand() * 20 * DAY * (i < 10 ? 0.02 : 1);
    const blocked = r.status === 'bloqueado';
    push({
      ...common,
      timestamp: ts,
      direction: rand() < 0.5 ? 'entrada' : 'saida',
      status: blocked ? 'negado' : 'permitido',
      reason: blocked ? 'Conta bloqueada' : '',
    });
  }

  return logs.sort((a, b) => b.timestamp - a.timestamp);
};

const accessLogs = buildAccessLogs();

/* --------------------------------- Convites ------------------------------- */
const invites = [
  { id: 1, code: 'MP-7F3A-91C2-B042', guestName: 'Carlos Eduardo Lima', guestCpf: cpf(321654987), unit: '42 · Bloco B', host: 'Mariana Souza', validFrom: NOW - 2 * HOUR, validUntil: NOW + 30 * HOUR, approved: true },
  { id: 2, code: 'MP-2B8D-44E1-A101', guestName: 'Fernanda Oliveira', guestCpf: cpf(987321654), unit: '101 · Bloco A', host: 'Roberto Almeida', validFrom: NOW - 24 * HOUR, validUntil: NOW + 5 * DAY, approved: true },
  { id: 3, code: 'MP-4D91-0AB7-A203', guestName: 'Marcos Vinícius Rocha', guestCpf: cpf(258369147), unit: '203 · Bloco A', host: 'Helena Duarte', validFrom: NOW - HOUR, validUntil: NOW + 6 * HOUR, approved: true },
  { id: 4, code: 'MP-8E22-C5F0-C012', guestName: 'Gustavo Pereira', guestCpf: cpf(741852963), unit: '12 · Bloco C', host: 'Beatriz Carvalho', validFrom: NOW - 5 * HOUR, validUntil: NOW + 3 * DAY, approved: true },
  { id: 5, code: 'MP-1C67-3E9A-B402', guestName: 'Diarista Maria José', guestCpf: cpf(159753486), unit: '402 · Bloco B', host: 'Patrícia Gomes', validFrom: NOW - 3 * HOUR, validUntil: NOW + 45 * MIN, approved: true },
  { id: 6, code: 'MP-6B05-D1C8-A501', guestName: 'Rafael Moura', guestCpf: cpf(486159753), unit: '501 · Bloco A', host: 'Thiago Nogueira', validFrom: NOW - 8 * HOUR, validUntil: NOW + 14 * HOUR, approved: true },
  // Não entram na lista de ativos: pendente de aprovação e expirado
  { id: 7, code: 'MP-9C1E-70D5-C015', guestName: 'Pedro Henrique Santos', guestCpf: cpf(147258369), unit: '15 · Bloco C', host: 'Juliana Prado', validFrom: NOW + DAY, validUntil: NOW + 2 * DAY, approved: false },
  { id: 8, code: 'MP-5A6F-12B8-B039', guestName: 'Lucas Martins', guestCpf: cpf(654987321), unit: '42 · Bloco B', host: 'Mariana Souza', validFrom: NOW - 3 * DAY, validUntil: NOW - DAY, approved: true },
];

/* --------------------------------- Chamados ------------------------------- */
let tickets = [
  { id: 1, morador: 'Mariana Souza', unidade: '42 · Bloco B', assunto: 'QR Code do convidado não leu na portaria', mensagem: 'Meu convidado Carlos tentou entrar há pouco e o leitor não reconheceu o QR Code. Podem conferir o código MP-7F3A-91C2-B042 manualmente?', criadoEm: NOW - 12 * MIN, status: 'aberto' },
  { id: 2, morador: 'Roberto Almeida', unidade: '101 · Bloco A', assunto: 'Autorizar entrega de móveis amanhã', mensagem: 'Teremos uma entrega de móveis amanhã entre 9h e 12h. Preciso que a portaria libere o caminhão na garagem.', criadoEm: NOW - 2 * HOUR, status: 'aberto' },
  { id: 3, morador: 'Beatriz Carvalho', unidade: '12 · Bloco C', assunto: 'Interfone da unidade sem som', mensagem: 'O interfone do apartamento está sem áudio desde ontem. Conseguem acionar a manutenção?', criadoEm: NOW - 5 * HOUR, status: 'aberto' },
  { id: 4, morador: 'Helena Duarte', unidade: '203 · Bloco A', assunto: 'Atualizar lista de convidados permanentes', mensagem: 'Gostaria de incluir minha mãe como acesso permanente e remover o antigo funcionário.', criadoEm: NOW - DAY, status: 'aberto' },
  { id: 5, morador: 'Patrícia Gomes', unidade: '402 · Bloco B', assunto: 'Encomenda aguardando na portaria', mensagem: 'Recebi aviso de uma encomenda na portaria, mas não consegui retirar. Ela ainda está guardada?', criadoEm: NOW - 2 * DAY, status: 'resolvido' },
  { id: 6, morador: 'Thiago Nogueira', unidade: '501 · Bloco A', assunto: 'Cadastro de nova tag veicular', mensagem: 'Troquei de carro e preciso atualizar a placa cadastrada para a garagem.', criadoEm: NOW - 3 * DAY, status: 'resolvido' },
];

/* ------------------------------- Operações -------------------------------- */
const sameDigits = (a, b) => String(a).replace(/\D/g, '') === String(b).replace(/\D/g, '');

const assertUnique = (data, ignoreId = null) => {
  const errors = {};
  const others = residents.filter((r) => r.id !== ignoreId);
  if (others.some((r) => sameDigits(r.cpf, data.cpf))) errors.cpf = 'Já existe um morador com este CPF.';
  if (others.some((r) => r.email.toLowerCase() === String(data.email).toLowerCase())) {
    errors.email = 'Já existe um morador com este e-mail.';
  }
  if (Object.keys(errors).length) throw new ApiError(409, 'Não foi possível salvar: dados já cadastrados.', errors);
};

export const getResumo = async () => {
  await delay();
  const today = startOfToday();

  // Visitante está "dentro" quando seu último evento permitido foi uma entrada
  const lastEvent = new Map();
  [...accessLogs]
    .filter((l) => l.personType === 'visitante' && l.status === 'permitido')
    .sort((a, b) => a.timestamp - b.timestamp)
    .forEach((l) => lastEvent.set(l.document, l.direction));

  return {
    acessosHoje: accessLogs.filter((l) => l.timestamp >= today && l.status === 'permitido' && l.direction === 'entrada').length,
    visitantesAgora: [...lastEvent.values()].filter((d) => d === 'entrada').length,
    moradores: residents.length,
    chamadosAbertos: tickets.filter((t) => t.status === 'aberto').length,
  };
};

export const listAcessos = async () => {
  await delay();
  return clone(accessLogs);
};

export const listMoradores = async () => {
  await delay();
  return clone(residents);
};

export const getMorador = async (id) => {
  await delay();
  const found = residents.find((r) => r.id === Number(id));
  if (!found) throw new ApiError(404, 'Morador não encontrado.');
  return clone({ ...found, convidados: guestsByResident[found.id] ?? [] });
};

export const createMorador = async (data) => {
  await delay(600);
  assertUnique(data);
  const created = { ...data, id: Math.max(0, ...residents.map((r) => r.id)) + 1 };
  residents = [created, ...residents];
  return clone(created);
};

export const updateMorador = async (id, data) => {
  await delay(600);
  const index = residents.findIndex((r) => r.id === Number(id));
  if (index === -1) throw new ApiError(404, 'Morador não encontrado.');
  assertUnique(data, Number(id));
  residents[index] = { ...residents[index], ...data, id: Number(id) };
  return clone(residents[index]);
};

export const listConvitesAtivos = async () => {
  await delay();
  const now = Date.now();
  return clone(
    invites
      .filter((i) => i.approved && i.validFrom <= now && i.validUntil > now)
      .sort((a, b) => a.validUntil - b.validUntil)
      .map(({ approved, ...rest }) => rest)
  );
};

export const listChamados = async () => {
  await delay();
  return clone([...tickets].sort((a, b) => b.criadoEm - a.criadoEm));
};

export const resolverChamado = async (id) => {
  await delay(500);
  const index = tickets.findIndex((t) => t.id === Number(id));
  if (index === -1) throw new ApiError(404, 'Chamado não encontrado.');
  tickets[index] = { ...tickets[index], status: 'resolvido' };
  return clone(tickets[index]);
};
