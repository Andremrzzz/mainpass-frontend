import { ApiError } from '../api';
import { createSeed } from './seed';

/* -------------------------------------------------------------------------- */
/*  Mini banco de dados sobre o localStorage                                  */
/*                                                                            */
/*  Todo o estado fica em UMA chave (`mainpass.db`), como um JSON:            */
/*    { version, residents, invites, tickets, accessLogs, seq }               */
/*                                                                            */
/*  - read(fn):        lê o banco e devolve fn(db); não grava.                */
/*  - transaction(fn): lê, executa fn(db) (que pode alterar db) e grava.      */
/*                     Se fn lançar erro, NADA é gravado.                     */
/*                                                                            */
/*  O banco é relido do storage a cada chamada (sem cache em memória), então  */
/*  várias abas do navegador enxergam sempre os mesmos dados.                 */
/*  Se o localStorage estiver bloqueado (aba anônima restrita), cai para      */
/*  memória: tudo funciona, mas os dados somem ao recarregar a página.        */
/* -------------------------------------------------------------------------- */

const STORAGE_KEY = 'mainpass.db';
const DB_VERSION = 1; // aumente ao mudar o formato: o banco local é recriado
const MAX_ACCESS_LOGS = 2000; // evita estourar a cota do localStorage (~5 MB)

let memoryRaw = null; // usado só quando o localStorage não está disponível
let storageChecked = false;
let storageOk = false;

const hasStorage = () => {
  if (!storageChecked) {
    storageChecked = true;
    try {
      const probe = '__mainpass_probe__';
      window.localStorage.setItem(probe, '1');
      window.localStorage.removeItem(probe);
      storageOk = true;
    } catch {
      storageOk = false;
      console.warn('[MainPass] localStorage indisponível: os dados não serão mantidos ao recarregar.');
    }
  }
  return storageOk;
};

const readRaw = () => (hasStorage() ? window.localStorage.getItem(STORAGE_KEY) : memoryRaw);

const writeRaw = (raw) => {
  if (!hasStorage()) {
    memoryRaw = raw;
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, raw);
  } catch {
    throw new ApiError(500, 'Não foi possível salvar: o armazenamento do navegador está cheio ou bloqueado.');
  }
};

const save = (db) => {
  if (db.accessLogs.length > MAX_ACCESS_LOGS) db.accessLogs.length = MAX_ACCESS_LOGS; // mantém os mais recentes
  writeRaw(JSON.stringify(db));
};

const load = () => {
  const raw = readRaw();
  if (raw) {
    try {
      const db = JSON.parse(raw);
      if (db && db.version === DB_VERSION) return db;
    } catch {
      console.warn('[MainPass] Banco local corrompido: recriando com os dados iniciais.');
    }
  }
  const fresh = createSeed(DB_VERSION);
  save(fresh);
  return fresh;
};

/** Leitura: fn recebe o banco e retorna o resultado. Nada é gravado. */
export const read = (fn) => fn(load());

/** Escrita atômica: fn altera o banco; ao terminar sem erro, tudo é gravado de uma vez. */
export const transaction = (fn) => {
  const db = load();
  const result = fn(db);
  save(db);
  return result;
};

/** Próximo id de uma coleção (equivale a uma sequence/auto-increment). */
export const nextId = (db, collection) => {
  db.seq[collection] = (db.seq[collection] || 0) + 1;
  return db.seq[collection];
};

/** Simula a latência de rede para manter o comportamento assíncrono realista. */
export const latency = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms + Math.random() * 120));

/** Apaga tudo e recria os dados iniciais (útil em testes: resetLocalData() no console). */
export const resetLocalData = () => {
  if (hasStorage()) window.localStorage.removeItem(STORAGE_KEY);
  memoryRaw = null;
  load();
};
