/* -------------------------------------------------------------------------- */
/*  Configuração de ambiente (sem dependências, para evitar import circular)  */
/*                                                                            */
/*  .env do front:                                                            */
/*    VITE_API_URL=http://localhost:8080   (vazio = modo local/localStorage)  */
/*    VITE_AMBIENTE_ID=1                   (ambiente que a portaria controla) */
/*    VITE_PERFIL_MORADOR=USUARIO           (valor do enum Perfil dos moradores)*/
/* -------------------------------------------------------------------------- */

export const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
export const USE_LOCAL = API_URL === '';

export const AMBIENTE_ID = Number(import.meta.env.VITE_AMBIENTE_ID) || null;
export const PERFIL_MORADOR = String(import.meta.env.VITE_PERFIL_MORADOR || 'USUARIO').toUpperCase();
