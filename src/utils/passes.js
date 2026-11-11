/* -------------------------------------------------------------------------- */
/*  Regras de negócio dos passes                                              */
/* -------------------------------------------------------------------------- */

// Status calculado a partir da aprovação e da validade
export const getStatus = (pass, now) => {
  if (!pass.approved) return 'pendente';
  if (now > pass.validUntil) return 'expirado';
  return 'valido';
};

// Percentual do período de validade já consumido (0-100)
export const getProgress = (pass, now) => {
  const total = pass.validUntil - pass.validFrom;
  const elapsed = Math.min(Math.max(now - pass.validFrom, 0), total);
  return Math.round((elapsed / total) * 100);
};

// Conteúdo codificado no QR Code (a portaria valida este formato)
export const getQrValue = (pass) => `MAINPASS|${pass.id}|${pass.code}`;
