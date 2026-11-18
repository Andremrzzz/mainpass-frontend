import { FOCUS_RING } from './dashboard';

/* -------------------------------------------------------------------------- */
/*  Classes reutilizáveis de formulário e botões                              */
/* -------------------------------------------------------------------------- */

export const inputBase =
  'h-11 w-full rounded-lg border bg-brand-900 px-3.5 text-sm text-slate-100 placeholder-slate-500 transition-colors duration-200 hover:border-white/25 focus:outline-none focus:ring-1 disabled:cursor-not-allowed disabled:opacity-60';
export const inputOk = 'border-white/15 focus:border-accent focus:ring-accent';
export const inputErr = 'border-rose-500/60 focus:border-rose-500 focus:ring-rose-500';

const btn =
  'inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50';

export const btnPrimary = `${btn} h-10 bg-accent px-4 text-white shadow-card hover:bg-accent-hover ${FOCUS_RING}`;
export const btnSecondary = `${btn} h-10 border border-white/15 px-4 text-slate-200 hover:border-white/25 hover:bg-white/[0.04] ${FOCUS_RING}`;
export const btnDanger = `${btn} h-10 border border-rose-500/30 px-4 text-rose-300 hover:bg-rose-500/10 ${FOCUS_RING}`;
export const btnIcon = `inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors duration-200 hover:bg-white/[0.06] hover:text-slate-100 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`;
