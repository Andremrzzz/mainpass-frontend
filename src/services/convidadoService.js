import * as http from './convidadoHttp';
import * as local from './local/convidadoLocal';
import { USE_LOCAL } from './env';

/* -------------------------------------------------------------------------- */
/*  Serviço da visão do Convidado (ÚNICO ponto de acesso a dados das telas)   */
/*                                                                            */
/*  Mesmo padrão de portariaService.js: dois drivers com a mesma interface.   */
/*   - local/convidadoLocal.js -> localStorage (dados de demonstração)        */
/*   - convidadoHttp.js        -> API REST (endpoints ainda por criar)        */
/*                                                                            */
/*  Enquanto o back-end não tiver os endpoints do Convidado, o driver local   */
/*  fica ativo MESMO com VITE_API_URL definida. Para integrar: implemente as  */
/*  funções de convidadoHttp.js e troque USE_HTTP_DRIVER para `!USE_LOCAL`.   */
/* -------------------------------------------------------------------------- */

const USE_HTTP_DRIVER = false; // trocar por `!USE_LOCAL` quando a API do convidado existir
const driver = USE_HTTP_DRIVER && !USE_LOCAL ? http : local;

export const getConvidado = (...a) => driver.getConvidado(...a);
export const updatePreferencias = (...a) => driver.updatePreferencias(...a);
export const resetarDemonstracao = (...a) => driver.resetarDemonstracao(...a);

export const listMensagens = (...a) => driver.listMensagens(...a);
export const enviarMensagem = (...a) => driver.enviarMensagem(...a);
export const marcarMensagensLidas = (...a) => driver.marcarMensagensLidas(...a);
export const subscribeMensagens = (...a) => driver.subscribeMensagens(...a);
