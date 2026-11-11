import React from 'react';
import { STATUS } from '../../constants/dashboard';

/** Badge de status do passe: Válido, Pendente ou Expirado. */
export default function StatusBadge({ status }) {
  const st = STATUS[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${st.badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`}></span>
      {st.label}
    </span>
  );
}
