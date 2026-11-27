/* -------------------------------------------------------------------------- */
/*  Regras de negócio dos passes                                              */
/* -------------------------------------------------------------------------- */

// Status calculado a partir da aprovação e da validade
//  decision (decisão da portaria): pendente | aprovado | recusado | cancelado | utilizado
//  Convite pendente ou recusado NUNCA vira 'valido': o QR Code só existe após a aprovação.
export const getStatus = (pass, now) => {
  if (pass.decision === 'recusado') return 'recusado';
  if (pass.decision === 'cancelado') return 'cancelado';
  if (pass.decision === 'utilizado') return 'utilizado';
  if (pass.decision === 'pendente' || !pass.approved) return now > pass.validUntil ? 'expirado' : 'pendente';
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
// Convite real: o QR carrega o token assinado pelo servidor (MPC.<id>.<assinatura>) exatamente como veio
export const getQrValue = (pass) =>
  String(pass.code ?? '').startsWith('MPC.') ? pass.code : `MAINPASS|${pass.id}|${pass.code}`;

// Convite (conviteService) -> passe exibido no dashboard do morador
export const toPass = (c, fallbackHost = '') => ({
  id: String(c.id),
  unit: c.ambiente || 'Ambiente',
  host: c.host || fallbackHost,
  approved: c.decision === 'aprovado',
  decision: c.decision,
  validFrom: c.validFrom,
  validUntil: c.validUntil,
  code: c.code,
  usos: c.usos,
  usosMax: c.usosMax,
  observacao: c.observacao,
  motivoRecusa: c.motivoRecusa,
  guest: { name: c.guest.name, cpf: c.guest.cpf, email: c.guest.email, phone: c.guest.phone },
});
