/* -------------------------------------------------------------------------- */
/*  Helpers de formatação                                                     */
/* -------------------------------------------------------------------------- */

// 08/11/2026, 14:32
export const fmtDate = (ts) =>
  new Date(ts).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

// 08/11, 14:32
export const fmtShort = (ts) =>
  new Date(ts).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

// 2d 5h restantes | 3h 10min restantes | 25min restantes
export const fmtRemaining = (ms) => {
  if (ms <= 0) return 'Encerrado';
  const totalMin = Math.floor(ms / 60000);
  const d = Math.floor(totalMin / 1440);
  const h = Math.floor((totalMin % 1440) / 60);
  const m = totalMin % 60;
  if (d > 0) return `${d}d ${h}h restantes`;
  if (h > 0) return `${h}h ${m}min restantes`;
  return `${m}min restantes`;
};

// 12345678901 -> ***.456.789-**
export const maskCpf = (cpf) => {
  const d = String(cpf ?? '').replace(/\D/g, '');
  if (d.length !== 11) return '—';
  return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`;
};

// "Carlos Eduardo Lima" -> "CE"
export const getInitials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
