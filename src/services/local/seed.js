import { formatUnit } from '../../utils/residents';

/* -------------------------------------------------------------------------- */
/*  Dados iniciais do banco local (criados uma única vez, no primeiro acesso) */
/*  Todos os horários são relativos ao momento da criação.                    */
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

const RESIDENTS = [
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
  { status: 'negado', reason: 'Convite aguardando aprovação da portaria' },
];

const buildInvites = (now) => [
  { id: 1, code: 'MP-7F3A-91C2-B042', residentId: 1, guestName: 'Carlos Eduardo Lima', guestCpf: cpf(321654987), validFrom: now - 2 * HOUR, validUntil: now + 30 * HOUR, approved: true },
  { id: 2, code: 'MP-2B8D-44E1-A101', residentId: 2, guestName: 'Fernanda Oliveira', guestCpf: cpf(987321654), validFrom: now - 24 * HOUR, validUntil: now + 5 * DAY, approved: true },
  { id: 3, code: 'MP-4D91-0AB7-A203', residentId: 4, guestName: 'Marcos Vinícius Rocha', guestCpf: cpf(258369147), validFrom: now - HOUR, validUntil: now + 6 * HOUR, approved: true },
  { id: 4, code: 'MP-8E22-C5F0-C012', residentId: 6, guestName: 'Gustavo Pereira', guestCpf: cpf(741852963), validFrom: now - 5 * HOUR, validUntil: now + 3 * DAY, approved: true },
  { id: 5, code: 'MP-1C67-3E9A-B402', residentId: 10, guestName: 'Diarista Maria José', guestCpf: cpf(159753486), validFrom: now - 3 * HOUR, validUntil: now + 45 * MIN, approved: true },
  { id: 6, code: 'MP-6B05-D1C8-A501', residentId: 7, guestName: 'Rafael Moura', guestCpf: cpf(486159753), validFrom: now - 8 * HOUR, validUntil: now + 14 * HOUR, approved: true },
  // Fora da lista de ativos: aguardando aprovação do morador e expirados
  { id: 7, code: 'MP-9C1E-70D5-C015', residentId: 3, guestName: 'Pedro Henrique Santos', guestCpf: cpf(147258369), validFrom: now + DAY, validUntil: now + 2 * DAY, approved: false },
  { id: 8, code: 'MP-5A6F-12B8-B039', residentId: 1, guestName: 'Lucas Martins', guestCpf: cpf(654987321), validFrom: now - 3 * DAY, validUntil: now - DAY, approved: true },
  { id: 9, code: 'MP-3D40-8B1F-A203', residentId: 4, guestName: 'Aline Cardoso', guestCpf: cpf(369147258), validFrom: now - 4 * DAY, validUntil: now - 3 * DAY, approved: true },
];

const buildTickets = (now) => [
  { id: 1, residentId: 1, morador: 'Mariana Souza', unidade: '42 · Bloco B', assunto: 'QR Code do convidado não leu na portaria', mensagem: 'Meu convidado Carlos tentou entrar há pouco e o leitor não reconheceu o QR Code. Podem conferir o código MP-7F3A-91C2-B042 manualmente?', criadoEm: now - 12 * MIN, status: 'aberto' },
  { id: 2, residentId: 2, morador: 'Roberto Almeida', unidade: '101 · Bloco A', assunto: 'Autorizar entrega de móveis amanhã', mensagem: 'Teremos uma entrega de móveis amanhã entre 9h e 12h. Preciso que a portaria libere o caminhão na garagem.', criadoEm: now - 2 * HOUR, status: 'aberto' },
  { id: 3, residentId: 6, morador: 'Beatriz Carvalho', unidade: '12 · Bloco C', assunto: 'Interfone da unidade sem som', mensagem: 'O interfone do apartamento está sem áudio desde ontem. Conseguem acionar a manutenção?', criadoEm: now - 5 * HOUR, status: 'aberto' },
  { id: 4, residentId: 4, morador: 'Helena Duarte', unidade: '203 · Bloco A', assunto: 'Atualizar lista de convidados permanentes', mensagem: 'Gostaria de incluir minha mãe como acesso permanente e remover o antigo funcionário.', criadoEm: now - DAY, status: 'aberto' },
  { id: 5, residentId: 10, morador: 'Patrícia Gomes', unidade: '402 · Bloco B', assunto: 'Encomenda aguardando na portaria', mensagem: 'Recebi aviso de uma encomenda na portaria, mas não consegui retirar. Ela ainda está guardada?', criadoEm: now - 2 * DAY, status: 'resolvido' },
  { id: 6, residentId: 7, morador: 'Thiago Nogueira', unidade: '501 · Bloco A', assunto: 'Cadastro de nova tag veicular', mensagem: 'Troquei de carro e preciso atualizar a placa cadastrada para a garagem.', criadoEm: now - 3 * DAY, status: 'resolvido' },
];

const buildAccessLogs = (now) => {
  const rand = mulberry32(20261112);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const logs = [];
  const push = (log) => logs.push({ id: `AC-${String(logs.length + 1).padStart(4, '0')}`, ...log });

  // Visitas (entrada e, quando já saíram, saída)
  for (let i = 0; i < 80; i += 1) {
    const visitor = pick(VISITORS);
    const host = pick(RESIDENTS);
    const recent = i < 14;
    const entry = now - (recent ? rand() * 9 * HOUR : 10 * HOUR + rand() * 29 * DAY);
    const common = {
      personName: visitor.nome,
      personType: 'visitante',
      document: visitor.cpf,
      unit: formatUnit(host),
      host: host.nome,
    };

    if (rand() < 0.14) {
      const denial = pick(DENIALS);
      push({ ...common, timestamp: entry, direction: 'entrada', status: denial.status, reason: denial.reason });
      continue;
    }

    push({ ...common, timestamp: entry, direction: 'entrada', status: 'permitido', reason: '' });
    const exit = entry + (30 + rand() * 150) * MIN;
    if (!recent || exit < now) {
      push({ ...common, timestamp: exit, direction: 'saida', status: 'permitido', reason: '' });
    }
  }

  // Passagens de moradores
  for (let i = 0; i < 40; i += 1) {
    const r = pick(RESIDENTS);
    const blocked = r.status === 'bloqueado';
    push({
      personName: r.nome,
      personType: 'morador',
      document: r.cpf,
      unit: formatUnit(r),
      host: r.nome,
      timestamp: now - rand() * 20 * DAY * (i < 10 ? 0.02 : 1),
      direction: rand() < 0.5 ? 'entrada' : 'saida',
      status: blocked ? 'negado' : 'permitido',
      reason: blocked ? 'Conta bloqueada' : '',
    });
  }

  return logs.sort((a, b) => b.timestamp - a.timestamp);
};

/** Cria o conteúdo inicial completo do banco local. */
export function createSeed(version, now = Date.now()) {
  const accessLogs = buildAccessLogs(now);
  const invites = buildInvites(now);
  const tickets = buildTickets(now);

  return {
    version,
    createdAt: now,
    residents: RESIDENTS.map((r) => ({ ...r })),
    invites,
    tickets,
    accessLogs,
    // Contadores de id (por coleção), como as sequences do banco
    seq: {
      residents: RESIDENTS.length,
      invites: invites.length,
      tickets: tickets.length,
      access: accessLogs.length,
    },
  };
}
