import { getSession } from '../../auth';
import { ApiError } from '../api';
import { read as readPortariaDb } from './localDb';
import { ambienteNome, decisionOf } from './inviteModel';

/* -------------------------------------------------------------------------- */
/*  Implementação LOCAL (localStorage) do serviço do Convidado.               */
/*                                                                            */
/*  Guarda perfil, QR Codes, entradas e chat em UMA chave por usuário         */
/*  (`mainpass.convidado.<email>`). Os dados de demonstração são gerados      */
/*  relativos ao momento do primeiro acesso (há sempre um QR ativo para       */
/*  testar) e podem ser recriados com resetarDemonstracao().                  */
/*  O morador responde às mensagens de forma simulada (ver simulateHost).     */
/* -------------------------------------------------------------------------- */

const VERSION = 1;
const H = 60 * 60 * 1000;
const D = 24 * H;

const DEMO_EMAIL = 'fernanda@email.com';
const memory = {}; // fallback quando o localStorage está bloqueado
const listeners = new Map(); // chave -> Set<fn(mensagens)>

const storageKey = () => `mainpass.convidado.${String(getSession()?.user?.email || 'anon').toLowerCase()}`;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

/* ------------------------------ Dados iniciais ----------------------------- */
const createSeed = () => {
  const now = Date.now();
  const user = getSession()?.user;
  const name = user?.name || 'Fernanda Prado';

  // Conta nova (auto-cadastro): sem anfitrião, QR Codes, entradas nem mensagens de outra pessoa.
  // Os dados de demonstração abaixo pertencem somente à conta de teste fernanda@email.com.
  if (user?.email && String(user.email).toLowerCase() !== DEMO_EMAIL) {
    return {
      version: VERSION,
      perfil: {
        nome: name,
        email: user.email,
        telefone: '',
        tipoDocumento: 'CPF',
        documento: '',
        anfitriao: null,
        convite: null,
        preferencias: { somNotificacao: true, avisoVisual: true, ocultarDadosSensiveis: false },
      },
      qrcodes: [],
      entradas: [],
      mensagens: [],
    };
  }

  return {
    version: VERSION,
    perfil: {
      nome: name,
      email: user?.email || 'fernanda@email.com',
      telefone: '11981234567',
      tipoDocumento: 'CPF',
      documento: '16899535009',
      anfitriao: { nome: 'Mariana Souza', bloco: 'B', unidade: '42', telefone: '11987654321' },
      convite: { inicio: now - D - 2 * H, fim: now + 2 * D, motivo: 'Visita familiar' },
      preferencias: { somNotificacao: true, avisoVisual: true, ocultarDadosSensiveis: false },
    },
    qrcodes: [
      { id: 'qr-101', token: 'MP-7F3A-91C2-D4E8', ambiente: 'Portaria Principal', local: 'Bloco B', validFrom: now - H, validUntil: now + 5 * H, usos: 0, usosMax: 2 },
      { id: 'qr-102', token: 'MP-2B90-5E1D-A7C3', ambiente: 'Garagem de Visitantes', local: 'Subsolo 1', validFrom: now + 22 * H, validUntil: now + 34 * H, usos: 0, usosMax: 1 },
      { id: 'qr-103', token: 'MP-C418-0DAF-6B52', ambiente: 'Portaria Principal', local: 'Bloco B', validFrom: now - D - 2 * H, validUntil: now + 6 * H, usos: 1, usosMax: 1 },
      { id: 'qr-104', token: 'MP-9E67-3C0B-F1A4', ambiente: 'Garagem de Visitantes', local: 'Subsolo 1', validFrom: now - 4 * D, validUntil: now - 3 * D, usos: 0, usosMax: 1 },
      { id: 'qr-105', token: 'MP-51D2-B8E6-0A39', ambiente: 'Portaria Principal', local: 'Bloco B', validFrom: now - 2 * D - 4 * H, validUntil: now - D, usos: 0, usosMax: 1, canceladoEm: now - 2 * D - 2 * H },
    ],
    entradas: [
      { id: 'en-1', timestamp: now - D - H, ambiente: 'Portaria Principal', status: 'autorizada', motivo: '', codigo: 'MP-C418-0DAF-6B52' },
      { id: 'en-2', timestamp: now - 2 * D - 2 * H, ambiente: 'Portaria Principal', status: 'negada', motivo: 'QR Code cancelado pelo morador', codigo: 'MP-51D2-B8E6-0A39' },
      { id: 'en-3', timestamp: now - 3 * D - 5 * H, ambiente: 'Garagem de Visitantes', status: 'expirada', motivo: 'QR Code fora do período de validade', codigo: 'MP-9E67-3C0B-F1A4' },
      { id: 'en-4', timestamp: now - 5 * D, ambiente: 'Portaria Principal', status: 'negada', motivo: 'Fora do horário permitido', codigo: 'MP-9E67-3C0B-F1A4' },
      { id: 'en-5', timestamp: now - 7 * D, ambiente: 'Portaria Principal', status: 'autorizada', motivo: '', codigo: 'MP-A03C-77B1-19DE' },
    ],
    mensagens: [
      { id: 'm-1', from: 'host', text: `Oi, ${name.split(' ')[0]}! Seu convite está liberado. Qualquer dúvida é só chamar por aqui.`, ts: now - 2 * D, status: 'read', lida: true },
      { id: 'm-2', from: 'guest', text: 'Obrigada, Mariana! Devo chegar por volta das 14h.', ts: now - 2 * D + 20 * 60000, status: 'read', lida: true },
      { id: 'm-3', from: 'host', text: 'Combinado! Lembre de apresentar o QR Code na portaria do Bloco B.', ts: now - 40 * 60000, status: 'read', lida: false },
    ],
  };
};

/* -------------------------------- Persistência ----------------------------- */
const load = (key) => {
  let raw = null;
  try {
    raw = window.localStorage.getItem(key);
  } catch {
    raw = memory[key] ?? null;
  }
  if (raw) {
    try {
      const db = JSON.parse(raw);
      if (db?.version === VERSION) return db;
    } catch {
      /* corrompido: recria abaixo */
    }
  }
  const db = createSeed();
  save(key, db);
  return db;
};

const save = (key, db) => {
  const raw = JSON.stringify(db);
  try {
    window.localStorage.setItem(key, raw);
  } catch {
    memory[key] = raw;
  }
};

/** Lê, altera e grava; devolve o que `fn` retornar. */
const update = (key, fn) => {
  const db = load(key);
  const result = fn(db);
  save(key, db);
  return result;
};

const emit = (key) => {
  const set = listeners.get(key);
  if (!set?.size) return;
  const list = [...load(key).mensagens];
  set.forEach((cb) => cb(list));
};

// Outra aba do navegador alterou o chat
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key && listeners.has(e.key)) emit(e.key);
  });
}

/* --------------------------------- Dados ----------------------------------- */
/**
 * Convites criados pelos moradores (banco da Portaria) para este convidado, casados por CPF ou e-mail.
 * Pendente/recusado vêm SEM token: o QR Code só é entregue depois da aprovação da portaria.
 */
const convitesDosMoradores = (perfil) => {
  const cpf = String(perfil.documento ?? '').replace(/\D/g, '');
  const email = String(perfil.email ?? '').toLowerCase();
  return readPortariaDb((db) =>
    db.invites
      .filter((i) => (cpf && i.guestCpf === cpf) || (email && String(i.guestEmail ?? '').toLowerCase() === email))
      .map((i) => {
        const decision = decisionOf(i);
        const host = db.residents.find((r) => r.id === i.residentId);
        return {
          id: `inv-${i.id}`,
          token: decision === 'aprovado' ? i.code : null,
          ambiente: i.ambienteNome ?? ambienteNome(i.ambienteId),
          local: host ? `Bloco ${host.bloco}` : '',
          validFrom: i.validFrom,
          validUntil: i.validUntil,
          usos: i.usos ?? 0,
          usosMax: i.usosMax ?? 1,
          aprovacao: decision === 'pendente' || decision === 'recusado' ? decision : undefined,
          canceladoEm: decision === 'cancelado' ? i.decididoEm ?? Date.now() : undefined,
          motivoRecusa: i.motivoRecusa || undefined,
        };
      })
  );
};

/** Snapshot da tela: { perfil, qrcodes, entradas } */
export const getConvidado = async () => {
  await delay(250);
  const { perfil, qrcodes, entradas } = load(storageKey());
  return { perfil, qrcodes: [...convitesDosMoradores(perfil), ...qrcodes], entradas };
};

export const updatePreferencias = async (patch) => {
  const key = storageKey();
  return update(key, (db) => {
    db.perfil.preferencias = { ...db.perfil.preferencias, ...patch };
    return db.perfil.preferencias;
  });
};

/** Apaga os dados do usuário e recria os de demonstração. */
export const resetarDemonstracao = async () => {
  const key = storageKey();
  save(key, createSeed());
  emit(key);
};

/* ---------------------------------- Chat ----------------------------------- */
export const listMensagens = async () => [...load(storageKey()).mensagens];

export const subscribeMensagens = (cb) => {
  const key = storageKey();
  if (!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key).add(cb);
  return () => listeners.get(key)?.delete(cb);
};

export const marcarMensagensLidas = async () => {
  const key = storageKey();
  const changed = update(key, (db) => {
    let any = false;
    db.mensagens.forEach((m) => {
      if (m.from === 'host' && !m.lida) {
        m.lida = true;
        any = true;
      }
    });
    return any;
  });
  if (changed) emit(key);
};

const setStatus = (key, id, status) => {
  update(key, (db) => {
    const m = db.mensagens.find((x) => x.id === id);
    if (m) m.status = status;
  });
  emit(key);
};

/** Resposta automática do morador (apenas demonstração; o servidor real substitui isto). */
const simulateHost = (key, text) => {
  const t = text.toLowerCase();
  let reply = 'Recebido! Qualquer coisa me avise por aqui.';
  if (/obrigad/.test(t)) reply = 'Por nada! Fique à vontade.';
  else if (/estender|horário|horario|mais tempo|renov/.test(t)) reply = 'Vou ver isso e já te aviso.';
  else if (/chegando|cheguei|portaria/.test(t)) reply = 'Perfeito! Já avisei a portaria, pode subir.';

  setTimeout(() => {
    update(key, (db) => {
      db.mensagens.push({ id: uid(), from: 'host', text: reply, ts: Date.now(), status: 'read', lida: false });
    });
    emit(key);
  }, 3500);
};

export const enviarMensagem = async (text) => {
  const clean = String(text ?? '').trim();
  if (!clean) throw new ApiError(400, 'Digite uma mensagem.');
  const key = storageKey();
  const message = { id: uid(), from: 'guest', text: clean.slice(0, 500), ts: Date.now(), status: 'sent', lida: true };
  update(key, (db) => {
    db.mensagens.push(message);
  });
  emit(key);

  // Entregue e lida pelo morador (simulado)
  setTimeout(() => setStatus(key, message.id, 'delivered'), 600);
  setTimeout(() => setStatus(key, message.id, 'read'), 1800);
  simulateHost(key, clean);
  return message;
};
