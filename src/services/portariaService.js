import { USE_LOCAL } from './api';
import * as http from './portariaHttp';
import * as local from './local/portariaLocal';

/* -------------------------------------------------------------------------- */
/*  Serviço do painel da Portaria (ÚNICO ponto de acesso a dados das telas)   */
/*                                                                            */
/*  Dois "drivers" com a mesma interface:                                     */
/*   - local/portariaLocal.js  -> localStorage (sem VITE_API_URL)             */
/*   - portariaHttp.js         -> API REST Spring Boot (com VITE_API_URL)     */
/*                                                                            */
/*  Para integrar o back-end: crie os endpoints abaixo, ajuste portariaHttp.js */
/*  se necessário, defina VITE_API_URL e apague a pasta services/local/.      */
/*  (Ao apagá-la, troque o `driver` abaixo por `http`.)                       */
/*                                                                            */
/*  CONTRATO DA API (JSON, autenticado com Bearer JWT):                       */
/*                                                                            */
/*  GET  /api/health                      -> 200                              */
/*  GET  /api/portaria/resumo             -> { acessosHoje, visitantesAgora,  */
/*                                             moradores, chamadosAbertos }   */
/*  GET  /api/acessos                     -> [{ id, timestamp (ms),           */
/*         personName, personType ('morador'|'visitante'), document (CPF),    */
/*         unit, host, direction ('entrada'|'saida'),                         */
/*         status ('permitido'|'negado'|'expirado'), reason? }]               */
/*  POST /api/acessos/validar             -> body { code, direction }         */
/*         valida o QR Code E registra o acesso (inclusive negativas);        */
/*         200 { allowed, status, reason, log: <acesso> }                     */
/*  GET  /api/moradores                   -> [Morador]                        */
/*  GET  /api/moradores/{id}              -> Morador + convidados[]           */
/*  POST /api/moradores                   -> Morador criado (201)             */
/*  PUT  /api/moradores/{id}              -> Morador atualizado               */
/*  GET  /api/convites?status=ativo       -> [Convite]                        */
/*  POST /api/convites                    -> body { residentId, guestName,    */
/*         guestCpf, validFrom?, validUntil, approved? } -> Convite (201);    */
/*         o servidor gera o `code`                                           */
/*  GET  /api/chamados                    -> [Chamado]                        */
/*  POST /api/chamados                    -> body { residentId, assunto,      */
/*         mensagem } -> Chamado (201)                                        */
/*  PUT  /api/chamados/{id}/resolver      -> Chamado atualizado               */
/*                                                                            */
/*  Morador = { id, nome, cpf (11 dígitos), email, telefone (10-11 dígitos),  */
/*              bloco, unidade, status ('ativo'|'bloqueado') }                */
/*  convidado = { id, nome, cpf, validade (ms), status                        */
/*                ('valido'|'pendente'|'expirado') }                          */
/*  Convite = { id, code, guestName, guestCpf, unit, host,                    */
/*              validFrom (ms), validUntil (ms) }                             */
/*  Chamado = { id, morador, unidade, assunto, mensagem, criadoEm (ms),       */
/*              status ('aberto'|'resolvido') }                               */
/*                                                                            */
/*  Erros: 4xx com { message, errors: { campo: 'mensagem' } }                 */
/*  (409 para CPF/e-mail duplicado, 404 para id inexistente).                 */
/*                                                                            */
/*  TODO (produção): paginar/filtrar /api/acessos e /api/moradores no         */
/*  servidor (?page=&size=&q=) em vez de filtrar tudo no navegador.           */
/* -------------------------------------------------------------------------- */

const driver = USE_LOCAL ? local : http;

/** Recursos que o driver ativo suporta (as telas escondem o que não existe). */
export const capabilities = driver.capabilities;

export const checkHealth = (...args) => driver.checkHealth(...args);

export const getResumo = (...args) => driver.getResumo(...args);

export const listAcessos = (...args) => driver.listAcessos(...args);
export const validarConvite = (...args) => driver.validarConvite(...args);

export const listMoradores = (...args) => driver.listMoradores(...args);
export const getMorador = (...args) => driver.getMorador(...args);
export const createMorador = (...args) => driver.createMorador(...args);
export const updateMorador = (...args) => driver.updateMorador(...args);

export const listConvitesAtivos = (...args) => driver.listConvitesAtivos(...args);
export const createConvite = (...args) => driver.createConvite(...args);

export const listSolicitacoes = (...args) => driver.listSolicitacoes(...args);
export const aprovarSolicitacao = (...args) => driver.aprovarSolicitacao(...args);
export const recusarSolicitacao = (...args) => driver.recusarSolicitacao(...args);

export const listChamados = (...args) => driver.listChamados(...args);
export const createChamado = (...args) => driver.createChamado(...args);
export const resolverChamado = (...args) => driver.resolverChamado(...args);
