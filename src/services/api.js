import { clearSession, getSession } from '../auth';

/* -------------------------------------------------------------------------- */
/*  Cliente HTTP do MainPass (Spring Boot)                                    */
/*                                                                            */
/*  Configuração: defina VITE_API_URL no arquivo .env do frontend, ex.:       */
/*    VITE_API_URL=http://localhost:8080                                      */
/*  Sem essa variável o sistema usa o armazenamento LOCAL do navegador         */
/*  (localStorage, ver services/local/), sem precisar de back-end.            */
/* -------------------------------------------------------------------------- */

export const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
export const USE_LOCAL = API_URL === '';

export class ApiError extends Error {
  /**
   * @param {number} status       código HTTP (0 = sem resposta / rede)
   * @param {string} message      mensagem amigável
   * @param {object|null} fieldErrors erros por campo, ex.: { cpf: 'CPF já cadastrado.' }
   */
  constructor(status, message, fieldErrors = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

const DEFAULT_MESSAGES = {
  403: 'Você não tem permissão para esta operação.',
  404: 'Registro não encontrado.',
  409: 'Já existe um registro com estes dados.',
};

const messageFor = (status) =>
  DEFAULT_MESSAGES[status] ??
  (status >= 500
    ? 'Erro interno no servidor. Tente novamente em instantes.'
    : 'Não foi possível concluir a operação.');

/**
 * Requisição JSON autenticada com o JWT da sessão.
 * Em 401 a sessão é encerrada e o usuário volta ao login.
 */
export async function request(path, { method = 'GET', body, timeoutMs = 15000 } = {}) {
  const session = getSession();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...(session?.token && { Authorization: `Bearer ${session.token}` }),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    throw new ApiError(
      0,
      err.name === 'AbortError'
        ? 'A API demorou demais para responder.'
        : 'Não foi possível conectar à API.'
    );
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 401) {
    clearSession();
    window.location.replace('/');
    throw new ApiError(401, 'Sessão expirada. Faça login novamente.');
  }

  const payload = res.status === 204 ? null : await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(res.status, payload?.message || messageFor(res.status), payload?.errors ?? null);
  }
  return payload;
}
