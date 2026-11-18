import React from 'react';

const TONES = {
  success: { badge: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20', dot: 'bg-emerald-400' },
  warning: { badge: 'bg-amber-500/10 text-amber-400 ring-amber-500/20', dot: 'bg-amber-400' },
  danger: { badge: 'bg-rose-500/10 text-rose-400 ring-rose-500/20', dot: 'bg-rose-400' },
  info: { badge: 'bg-blue-500/10 text-blue-300 ring-blue-500/20', dot: 'bg-blue-400' },
  neutral: { badge: 'bg-white/[0.04] text-slate-300 ring-white/[0.08]', dot: 'bg-slate-400' },
};

/** Badge discreto de status. `tone`: success | warning | danger | info | neutral. */
export default function Badge({ tone = 'neutral', dot = true, children }) {
  const t = TONES[tone] ?? TONES.neutral;

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${t.badge}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`}></span>}
      {children}
    </span>
  );
}
