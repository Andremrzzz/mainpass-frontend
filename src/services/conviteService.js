import { USE_LOCAL } from './env';
import * as http from './conviteHttp';
import * as local from './local/conviteLocal';

/* -------------------------------------------------------------------------- */
/*  Serviço de convites do MORADOR (ponto único de acesso das telas)          */
/*   - local/conviteLocal.js -> localStorage (mesmo banco da Portaria)        */
/*   - conviteHttp.js        -> API REST (/api/convites)                      */
/*                                                                            */
/*  Todo convite novo nasce "pendente": o QR Code só existe depois que a      */
/*  portaria aprova (POST /api/portaria/convites/{id}/aprovar).               */
/* -------------------------------------------------------------------------- */

const driver = USE_LOCAL ? local : http;

export const listMeusConvites = (...a) => driver.listMeusConvites(...a);
export const createConvite = (...a) => driver.createConvite(...a);
export const cancelarConvite = (...a) => driver.cancelarConvite(...a);
export const listAmbientes = (...a) => driver.listAmbientes(...a);
