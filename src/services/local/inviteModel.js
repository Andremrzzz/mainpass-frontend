/* -------------------------------------------------------------------------- */
/*  Modelo local do convite (db.invites), compartilhado pelos drivers locais  */
/*                                                                            */
/*  decisão da portaria: 'pendente' | 'aprovado' | 'recusado' | 'cancelado'    */
/*  Registros antigos (sem `status`) usam o booleano `approved`.              */
/*  `approved` é mantido em sincronia (true só quando aprovado).              */
/* -------------------------------------------------------------------------- */

export const decisionOf = (invite) => invite.status ?? (invite.approved === false ? 'pendente' : 'aprovado');

export const setDecision = (invite, decision) => {
  invite.status = decision;
  invite.approved = decision === 'aprovado';
};

// Ambientes disponíveis no modo local (a API real usa a tabela `ambiente`)
export const LOCAL_AMBIENTES = [
  { id: 1, nome: 'Portaria Principal' },
  { id: 2, nome: 'Garagem de Visitantes' },
  { id: 3, nome: 'Salão de Festas' },
];

export const ambienteNome = (id) => LOCAL_AMBIENTES.find((a) => a.id === Number(id))?.nome ?? 'Portaria Principal';
