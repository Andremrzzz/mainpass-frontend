import { ApiError } from './api';

/* -------------------------------------------------------------------------- */
/*  Driver HTTP do Convidado (AINDA NÃO IMPLEMENTADO NO BACK-END)             */
/*                                                                            */
/*  Cada função abaixo indica o endpoint que o back-end precisa expor. Quando */
/*  existirem, troque o `throw` por `request(...)` (de ./api, que já anexa o  */
/*  Bearer JWT e trata 401) e converta a resposta para a forma que o driver   */
/*  local devolve. Formas esperadas pelas telas:                              */
/*                                                                            */
/*  getConvidado() -> { perfil, qrcodes, entradas }                           */
/*    perfil   { nome, email, telefone, tipoDocumento, documento,             */
/*               anfitriao{nome,bloco,unidade,telefone},                      */
/*               convite{inicio,fim,motivo}, preferencias{...} }              */
/*    qrcodes  [{ id, token, ambiente, local, validFrom, validUntil (ms),     */
/*                usos, usosMax, canceladoEm? }]                              */
/*    entradas [{ id, timestamp (ms), ambiente, status                        */
/*                ('autorizada'|'negada'|'expirada'), motivo, codigo }]       */
/*                                                                            */
/*  Mapeamento sugerido para o back-end atual (br.mainpass.acesso):           */
/*    qrcodes  <- GET /api/qrcodes/meus   (QR Codes do usuário logado; o      */
/*               token só existe na geração, então o back precisa devolvê-lo  */
/*               enquanto o QR estiver ativo ou guardar o payload para        */
/*               reexibição)                                                  */
/*    entradas <- GET /api/acessos/meus   (RegistroAcesso do usuário;         */
/*               PERMITIDO->autorizada, RECUSADO+motivo EXPIRADO->expirada,   */
/*               demais recusas->negada). Datas ISO -> Date.parse().          */
/*    perfil   <- GET /api/usuarios/me    (+ anfitrião/convite: ainda sem     */
/*               modelo no back-end; ver "convite de convidado")              */
/*    preferências -> PUT /api/usuarios/me/preferencias (ou só localStorage)  */
/*                                                                            */
/*  Chat (não existe no back-end; escolha entre polling e WebSocket/SSE):     */
/*    GET  /api/convidado/mensagens          -> [mensagem]                    */
/*    POST /api/convidado/mensagens {texto}  -> mensagem                      */
/*    PUT  /api/convidado/mensagens/lidas    -> 204                           */
/*    subscribeMensagens: polling a cada ~5 s ou /ws, devolvendo a lista      */
/*    mensagem = { id, from ('host'|'guest'), text, ts (ms),                  */
/*                 status ('sent'|'delivered'|'read'), lida }                 */
/* -------------------------------------------------------------------------- */

const notReady = (what) => () => Promise.reject(new ApiError(501, `${what} ainda não está disponível na API.`));

export const getConvidado = notReady('Os dados do convidado');
export const updatePreferencias = notReady('As preferências');
export const resetarDemonstracao = notReady('A restauração de demonstração');
export const listMensagens = notReady('O chat');
export const enviarMensagem = notReady('O chat');
export const marcarMensagensLidas = notReady('O chat');
export const subscribeMensagens = () => () => {};
