import { request } from './api';

/* -------------------------------------------------------------------------- */
/*  Implementação HTTP (Spring Boot) do serviço da portaria.                  */
/*                                                                            */
/*  Mesma interface de local/portariaLocal.js. Ajuste os caminhos/formatos    */
/*  aqui quando criar os controllers; as telas não precisam mudar.            */
/*  Contrato completo documentado em portariaService.js.                      */
/* -------------------------------------------------------------------------- */

export const checkHealth = () => request('/api/health', { timeoutMs: 5000 });

export const getResumo = () => request('/api/portaria/resumo');

export const listAcessos = () => request('/api/acessos');

export const validarConvite = ({ code, direction = 'entrada' }) =>
  request('/api/acessos/validar', { method: 'POST', body: { code, direction } });

export const listMoradores = () => request('/api/moradores');

export const getMorador = (id) => request(`/api/moradores/${id}`);

export const createMorador = (data) => request('/api/moradores', { method: 'POST', body: data });

export const updateMorador = (id, data) => request(`/api/moradores/${id}`, { method: 'PUT', body: data });

export const listConvitesAtivos = () => request('/api/convites?status=ativo');

export const createConvite = (data) => request('/api/convites', { method: 'POST', body: data });

export const listChamados = () => request('/api/chamados');

export const createChamado = (data) => request('/api/chamados', { method: 'POST', body: data });

export const resolverChamado = (id) => request(`/api/chamados/${id}/resolver`, { method: 'PUT' });
