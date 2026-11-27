/* -------------------------------------------------------------------------- */
/*  MainPass - módulo de autenticação (sessão, roles e login simulado)        */
/*                                                                            */
/*  ATENÇÃO: o controle de acesso no front-end é apenas experiência de uso.   */
/*  A autorização real (RBAC) precisa ser aplicada pela API em cada endpoint. */
/* -------------------------------------------------------------------------- */

import { API_URL, USE_LOCAL } from './services/env';

export const ROLES = {
  USER: 'ROLE_USER',
  CONVIDADO: 'ROLE_CONVIDADO',
  PORTEIRO: 'ROLE_PORTEIRO',
  ADMIN: 'ROLE_ADMIN',
};

// Rota inicial de cada perfil após o login
export const ROLE_HOME = {
  [ROLES.USER]: '/dashboard',
  [ROLES.CONVIDADO]: '/convidado',
  [ROLES.PORTEIRO]: '/portaria',
  [ROLES.ADMIN]: '/admin',
};

export const getHomeRoute = (role) => ROLE_HOME[role] ?? null;

const STORAGE_KEYS = {
  token: 'mainpass.token',
  role: 'mainpass.role',
  user: 'mainpass.user',
};

export class AuthError extends Error {
  constructor(code, message) {
    super(message || code);
    this.name = 'AuthError';
    this.code = code; // 'INVALID_CREDENTIALS' | 'SERVER_ERROR'
  }
}

/* -------------------------------------------------------------------------- */
/*  JWT                                                                       */
/* -------------------------------------------------------------------------- */
const encodeSegment = (obj) => {
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  let bin = '';
  bytes.forEach((b) => {
    bin += String.fromCharCode(b);
  });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const decodeSegment = (segment) => {
  const b64 = segment.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, '='));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
};

// Lê o payload do JWT (sem validar assinatura: isso é papel do back-end)
export const decodeJwt = (token) => {
  try {
    const parts = String(token).split('.');
    if (parts.length !== 3) return null;
    return decodeSegment(parts[1]);
  } catch (err) {
    return null;
  }
};

/* -------------------------------------------------------------------------- */
/*  Roles                                                                     */
/* -------------------------------------------------------------------------- */
// Perfis do back-end (enum Perfil) -> roles do front-end
const PERFIL_ALIASES = {
  OPERADOR: 'PORTEIRO',
  MORADOR: 'USER',
  USUARIO: 'USER',
};

const normalizeRole = (value) => {
  const raw = value && typeof value === 'object' ? value.authority : value;
  if (typeof raw !== 'string') return null;
  const bare = raw.trim().toUpperCase().replace(/^ROLE_/, '');
  const role = `ROLE_${PERFIL_ALIASES[bare] ?? bare}`;
  return Object.values(ROLES).includes(role) ? role : null;
};

const ROLE_PRIORITY = [ROLES.ADMIN, ROLES.PORTEIRO, ROLES.USER, ROLES.CONVIDADO];

// Aceita { role }, { roles: [...] } ou { authorities: [...] } (resposta da API ou claims do JWT)
export const extractRole = (source) => {
  if (!source) return null;
  const list = [
    source.perfil, // claim do JwtService do Spring Boot
    source.role,
    ...(Array.isArray(source.roles) ? source.roles : [source.roles]),
    ...(Array.isArray(source.authorities) ? source.authorities : [source.authorities]),
  ];
  const found = new Set(list.map(normalizeRole).filter(Boolean));
  return ROLE_PRIORITY.find((r) => found.has(r)) ?? null;
};

// Detecta a role na resposta da API e, se não vier, nos claims do token
export const resolveRole = (data) =>
  extractRole(data) ?? extractRole(decodeJwt(data?.token));

/* -------------------------------------------------------------------------- */
/*  Sessão (localStorage)                                                     */
/* -------------------------------------------------------------------------- */
export const saveSession = ({ token, role, user }) => {
  try {
    localStorage.setItem(STORAGE_KEYS.token, token);
    localStorage.setItem(STORAGE_KEYS.role, role);
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user ?? null));
    return true;
  } catch (err) {
    return false;
  }
};

export const clearSession = () => {
  try {
    Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
  } catch (err) {
    /* armazenamento indisponível: nada a limpar */
  }
};

// Retorna { token, role, user } ou null (sem sessão, expirada ou com role desconhecida)
export const getSession = () => {
  try {
    const token = localStorage.getItem(STORAGE_KEYS.token);
    if (!token) return null;

    const claims = decodeJwt(token);
    if (claims?.exp && claims.exp * 1000 <= Date.now()) {
      clearSession();
      return null;
    }

    // A role vem preferencialmente do token; o valor salvo é apenas fallback
    const role = extractRole(claims) ?? normalizeRole(localStorage.getItem(STORAGE_KEYS.role));
    if (!role) {
      clearSession();
      return null;
    }

    const user = JSON.parse(localStorage.getItem(STORAGE_KEYS.user) || 'null');
    return { token, role, user };
  } catch (err) {
    return null;
  }
};

/* -------------------------------------------------------------------------- */
/*  Login simulado                                                            */
/*                                                                            */
/*  Credenciais de teste (apenas desenvolvimento):                            */
/*   ROLE_PORTEIRO  porteiro@mainpass.com  | CPF 111.444.777-35 | Porteiro@123 */
/*   ROLE_ADMIN     admin@mainpass.com     | CPF 529.982.247-25 | Admin@1234   */
/*   ROLE_USER      carlos.lima@email.com  | CPF 390.533.447-05 | Convidado@123*/
/*   ROLE_CONVIDADO fernanda@email.com     | CPF 168.995.350-09 | Convidado@123*/
/* -------------------------------------------------------------------------- */
const MOCK_USERS = [
  {
    email: 'porteiro@mainpass.com',
    cpf: '11144477735',
    password: 'Porteiro@123',
    role: ROLES.PORTEIRO,
    name: 'Roberto Almeida',
  },
  {
    email: 'admin@mainpass.com',
    cpf: '52998224725',
    password: 'Admin@1234',
    role: ROLES.ADMIN,
    name: 'Helena Duarte',
  },
  {
    email: 'carlos.lima@email.com',
    cpf: '39053344705',
    password: 'Convidado@123',
    role: ROLES.USER,
    name: 'Carlos Eduardo Lima',
  },
  {
    email: 'fernanda@email.com',
    cpf: '16899535009',
    password: 'Convidado@123',
    role: ROLES.CONVIDADO,
    name: 'Fernanda Prado',
  },
];

// Contas criadas pelo cadastro no modo local (só demonstração: senha em texto puro no navegador)
const LOCAL_USERS_KEY = 'mainpass.mock.users';
const readLocalUsers = () => {
  try {
    const list = JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
};

// Modo local (sem VITE_API_URL): usuários de teste acima.
const authenticateMock = async (login, password) => {
  await new Promise((resolve) => setTimeout(resolve, 900));

  // Atenção: comparar senha em texto puro é aceitável só nesta simulação.
  const found = [...MOCK_USERS, ...readLocalUsers()].find(
    (u) => (u.email === login || (u.cpf && u.cpf === login)) && u.password === password
  );
  if (!found) throw new AuthError('INVALID_CREDENTIALS');

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: found.email,
    name: found.name,
    role: found.role,
    iat: now,
    exp: now + 8 * 60 * 60, // 8 horas
  };
  const token = `${encodeSegment({ alg: 'HS256', typ: 'JWT' })}.${encodeSegment(payload)}.mock-signature`;

  return {
    token,
    role: found.role,
    user: { name: found.name, email: found.email },
  };
};

/* -------------------------------------------------------------------------- */
/*  Login real (Spring Boot)                                                  */
/*                                                                            */
/*  POST /api/auth/login  ->  { token, tipo, expiraEmSegundos }               */
/*  A role e o usuário vêm das claims do JWT: sub (e-mail), perfil e,         */
/*  opcionalmente, nome. Usa fetch direto (e não request()) porque um 401     */
/*  aqui significa "credenciais inválidas", não "sessão expirada".            */
/* -------------------------------------------------------------------------- */

// Corpo esperado pelo LoginRequest do back-end. Ajuste aqui se os nomes forem outros.
const buildLoginPayload = (login, password) => ({ email: login, senha: password });

const nameFromEmail = (email) =>
  String(email || '')
    .split('@')[0]
    .split(/[._-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

const authenticateApi = async (login, password) => {
  let res;
  try {
    res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(buildLoginPayload(login, password)),
    });
  } catch (err) {
    throw new AuthError('SERVER_ERROR', 'Não foi possível conectar à API.');
  }

  if (res.status === 401 || res.status === 403) throw new AuthError('INVALID_CREDENTIALS');
  if (!res.ok) throw new AuthError('SERVER_ERROR', `Falha no login (HTTP ${res.status}).`);

  const data = await res.json().catch(() => null);
  if (!data?.token) throw new AuthError('SERVER_ERROR', 'Resposta de login inválida.');

  const claims = decodeJwt(data.token);
  const email = claims?.sub ?? login;
  return {
    token: data.token,
    role: extractRole(claims), // null => a tela de login avisa "perfil não reconhecido"
    user: { name: claims?.nome ?? claims?.name ?? nameFromEmail(email), email },
  };
};

/**
 * Autentica com e-mail ou CPF (já normalizado: e-mail em minúsculas ou só dígitos).
 * Retorna { token, role, user } ou lança AuthError('INVALID_CREDENTIALS' | 'SERVER_ERROR').
 */
export const authenticate = (login, password) =>
  USE_LOCAL ? authenticateMock(login, password) : authenticateApi(login, password);

/* -------------------------------------------------------------------------- */
/*  Cadastro (auto-cadastro)                                                  */
/*                                                                            */
/*  REGRA: toda conta criada por aqui é CONVIDADO. O cliente não escolhe o    */
/*  perfil (não existe esse parâmetro) e o back-end também fixa CONVIDADO.    */
/*  Conta de Morador só é criada pelo porteiro (Gestão de Moradores).         */
/*                                                                            */
/*  POST /api/auth/cadastro  { nome, email, senha }  ->  201 { id, nome,      */
/*  email, perfil: "CONVIDADO" }   |  409 EMAIL_EM_USO  |  400 validação      */
/* -------------------------------------------------------------------------- */
const registerMock = async ({ name, email, password }) => {
  await new Promise((resolve) => setTimeout(resolve, 900));
  const mail = String(email).trim().toLowerCase();
  const users = readLocalUsers();
  if ([...MOCK_USERS, ...users].some((u) => u.email === mail)) throw new AuthError('EMAIL_IN_USE');
  users.push({ email: mail, cpf: '', password, role: ROLES.CONVIDADO, name: String(name).trim() });
  try {
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
  } catch {
    throw new AuthError('SERVER_ERROR', 'Não foi possível salvar o cadastro neste navegador.');
  }
  return { name: String(name).trim(), email: mail, role: ROLES.CONVIDADO };
};

const registerApi = async ({ name, email, password }) => {
  let res;
  try {
    res = await fetch(`${API_URL}/api/auth/cadastro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ nome: String(name).trim(), email: String(email).trim().toLowerCase(), senha: password }),
    });
  } catch {
    throw new AuthError('SERVER_ERROR', 'Não foi possível conectar à API.');
  }
  if (res.status === 409) throw new AuthError('EMAIL_IN_USE');
  if (res.status === 400) {
    const body = await res.json().catch(() => null);
    throw new AuthError('INVALID_DATA', body?.mensagem);
  }
  if (!res.ok) throw new AuthError('SERVER_ERROR', `Falha no cadastro (HTTP ${res.status}).`);
  return res.json().catch(() => ({}));
};

export const register = ({ name, email, password }) =>
  USE_LOCAL ? registerMock({ name, email, password }) : registerApi({ name, email, password });
