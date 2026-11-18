/* -------------------------------------------------------------------------- */
/*  Helpers de moradores                                                      */
/* -------------------------------------------------------------------------- */

// "42 · Bloco B"
export const formatUnit = (r) => `${r.unidade} · Bloco ${r.bloco}`;

// Campos enviados à API (PUT/POST /api/moradores)
export const toResidentPayload = (r) => ({
  nome: r.nome,
  cpf: r.cpf,
  email: r.email,
  telefone: r.telefone,
  bloco: r.bloco,
  unidade: r.unidade,
  status: r.status,
});
